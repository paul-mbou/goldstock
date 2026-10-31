import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Deposit, Member, Notification, RoleId } from '../../data/dashboard';
import { isAuthLive } from '../auth';
import { fetchOwner, fetchShop } from '../shop';
import { getSupabase } from '../supabase';
import {
  dateFromDay,
  mapDeposit,
  mapMember,
  mapNotification,
  type DepositRow,
  type MemberRow,
  type NotificationRow,
  type StaffSnapshot,
} from './types';

export type StaffError =
  | 'not-signed-in'
  | 'no-shop'
  | 'failed'
  | 'not-found'
  | 'account-exists'
  | 'invalid-email'
  | 'forbidden'
  | 'invite-failed';
export type StaffResult<T> = { ok: true; value: T } | { ok: false; error: StaffError };

const fail = <T>(error: StaffError): StaffResult<T> => ({ ok: false, error });
const ok = <T>(value: T): StaffResult<T> => ({ ok: true, value });

const WELCOME: Omit<Notification, 'at'> & { at?: number } = {
  id: 'n-welcome',
  kind: 'system',
  title: 'Bienvenue sur GOLDSTOCK',
  body: 'Commencez par ajouter vos produits : la caisse, le stock et les rapports se remplissent ensuite tout seuls.',
  read: false,
  href: '/app/produits/fiche',
};

export async function loadStaff(shopId: string): Promise<StaffResult<StaffSnapshot>> {
  if (!isAuthLive) return fail('not-signed-in');
  const supabase = getSupabase();
  let [
    { data: memberRows, error: memberError },
    { data: depositRows, error: depositError },
    { data: notificationRows, error: notificationError },
  ] = await Promise.all([
    supabase.from('shop_members').select('*').eq('shop_id', shopId).order('created_at'),
    supabase.from('deposits').select('*').eq('shop_id', shopId).order('day', { ascending: false }).limit(100),
    supabase.from('notifications').select('*').eq('shop_id', shopId).order('at', { ascending: false }).limit(100),
  ]);
  if (memberError || depositError || notificationError) return fail('failed');

  if (!memberRows?.length) {
    const seeded = await seedOwner(shopId);
    if (!seeded.ok) return seeded;
    memberRows = [seeded.value];
  }

  if (!notificationRows?.length) {
    const welcome = await insertRemoteNotification(shopId, { ...WELCOME, at: Date.now() });
    notificationRows = welcome.ok
      ? [
          {
            id: welcome.value.id,
            shop_id: shopId,
            kind: welcome.value.kind,
            title: welcome.value.title,
            body: welcome.value.body,
            at: new Date(welcome.value.at).toISOString(),
            read: welcome.value.read,
            href: welcome.value.href,
            roles: welcome.value.roles ?? null,
          },
        ]
      : [];
  }

  return ok({
    team: (memberRows as MemberRow[]).map(mapMember),
    deposits: ((depositRows as DepositRow[] | null) ?? []).map(mapDeposit),
    notifications: ((notificationRows as NotificationRow[] | null) ?? []).map(mapNotification),
  });
}

async function seedOwner(shopId: string): Promise<StaffResult<MemberRow>> {
  const supabase = getSupabase();
  const [{ data: auth }, owner, shop] = await Promise.all([supabase.auth.getUser(), fetchOwner(), fetchShop()]);
  const user = auth.user;
  if (!user) return fail('not-signed-in');
  // Only the account holder may create the owner roster row (never invited staff).
  const { data: owned } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!owned) return fail('forbidden');
  const { data, error } = await supabase
    .from('shop_members')
    .insert({
      shop_id: shopId,
      user_id: user.id,
      email: user.email ?? '',
      name: owner?.fullName?.trim() || shop?.name || 'Propriétaire',
      role: 'owner',
      phone: owner?.phone ?? '',
      shop_scope: 'Toutes',
      status: 'active',
      last_seen: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) return fail('failed');
  return ok(data as MemberRow);
}

/** Roster row for the signed-in auth user in this shop, if any. */
export async function fetchMyMembership(shopId: string): Promise<StaffResult<Member | null>> {
  if (!isAuthLive) return fail('not-signed-in');
  const supabase = getSupabase();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail('not-signed-in');
  const { data, error } = await supabase
    .from('shop_members')
    .select('*')
    .eq('shop_id', shopId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) return fail('failed');
  return ok(data ? mapMember(data as MemberRow) : null);
}

/** Marks the signed-in invited member as active (RPC; staff cannot UPDATE roster rows). */
export async function activateMyMembership(): Promise<StaffResult<Member | null>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().rpc('activate_my_membership');
  if (error) return fail('failed');
  return ok(data ? mapMember(data as MemberRow) : null);
}

/** Invites staff via the Edge Function (creates auth user + shop_members row). */
export async function inviteRemoteMember(input: {
  name: string;
  email: string;
  phone: string;
  role: Exclude<RoleId, 'owner'>;
  shopScope: string;
}): Promise<StaffResult<Member>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().functions.invoke<{ member?: MemberRow; error?: string }>(
    'invite-member',
    {
      body: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        shopScope: input.shopScope,
      },
    },
  );
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await (error.context as Response).json().catch(() => ({}));
      const code = typeof payload.error === 'string' ? payload.error : 'invite-failed';
      if (code === 'account-exists') return fail('account-exists');
      if (code === 'invalid-email') return fail('invalid-email');
      if (code === 'forbidden') return fail('forbidden');
      if (code === 'not-signed-in') return fail('not-signed-in');
      return fail('invite-failed');
    }
    return fail('failed');
  }
  if (!data?.member) return fail('invite-failed');
  return ok(mapMember(data.member));
}

export async function updateRemoteMember(
  id: string,
  patch: Partial<Pick<Member, 'role' | 'status' | 'name' | 'phone' | 'shop'>>,
): Promise<StaffResult<Member>> {
  if (!isAuthLive) return fail('not-signed-in');
  const payload: Record<string, unknown> = {};
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.phone !== undefined) payload.phone = patch.phone;
  if (patch.shop !== undefined) payload.shop_scope = patch.shop;
  const { data, error } = await getSupabase().from('shop_members').update(payload).eq('id', id).select('*').single();
  if (error || !data) return fail('failed');
  return ok(mapMember(data as MemberRow));
}

export async function declareRemoteDeposit(
  shopId: string,
  input: {
    day: number;
    shopName: string;
    managerName: string;
    expected: number;
    deposited: number;
    method: string;
    reference: string;
    comment: string;
    notificationTitle: string;
    notificationBody: string;
  },
): Promise<StaffResult<{ deposit: Deposit; notification: Notification }>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().rpc('declare_deposit', {
    p_shop_id: shopId,
    p_day: dateFromDay(input.day),
    p_shop_name: input.shopName,
    p_manager_name: input.managerName,
    p_expected: input.expected,
    p_deposited: input.deposited,
    p_method: input.method,
    p_reference: input.reference,
    p_comment: input.comment,
    p_notification_title: input.notificationTitle,
    p_notification_body: input.notificationBody,
  });
  if (error || !data) return fail('failed');
  const deposit = mapDeposit(data as DepositRow);
  const notification: Notification = {
    id: `n-${deposit.id}`,
    kind: 'deposit',
    title: input.notificationTitle,
    body: input.notificationBody,
    at: deposit.depositedAt,
    read: false,
    href: '/app/versements',
    roles: ['owner'],
  };
  return ok({ deposit, notification });
}

export async function withdrawRemoteDeposit(id: string): Promise<StaffResult<true>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase().rpc('withdraw_deposit', { p_deposit_id: id });
  if (error) return fail('failed');
  return data ? ok(true) : fail('not-found');
}

export async function updateRemoteDeposit(
  id: string,
  patch: Pick<Deposit, 'status' | 'note'>,
): Promise<StaffResult<Deposit>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase()
    .from('deposits')
    .update({ status: patch.status, note: patch.note })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return fail('failed');
  return ok(mapDeposit(data as DepositRow));
}

export async function insertRemoteNotification(
  shopId: string,
  notification: Notification,
): Promise<StaffResult<Notification>> {
  if (!isAuthLive) return fail('not-signed-in');
  const { data, error } = await getSupabase()
    .from('notifications')
    .insert({
      id: notification.id,
      shop_id: shopId,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      at: new Date(notification.at).toISOString(),
      read: notification.read,
      href: notification.href,
      roles: notification.roles ?? null,
    })
    .select('*')
    .single();
  if (error || !data) return fail('failed');
  return ok(mapNotification(data as NotificationRow));
}

export async function markRemoteNotificationsRead(ids: string[]): Promise<StaffResult<true>> {
  if (!isAuthLive || !ids.length) return ok(true);
  const { error } = await getSupabase().from('notifications').update({ read: true }).in('id', ids);
  return error ? fail('failed') : ok(true);
}

export type { RoleId };
