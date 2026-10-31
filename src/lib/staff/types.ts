import type {
  Deposit,
  DepositStatus,
  Member,
  MemberStatus,
  Notification,
  NotificationKind,
  RoleId,
} from '../../data/dashboard';

export type MemberRow = {
  id: string;
  shop_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  user_id: string | null;
  shop_scope: string;
  status: string;
  last_seen: string | null;
};

export type DepositRow = {
  id: string;
  shop_id: string;
  day: string;
  shop_name: string;
  manager_name: string;
  expected: number;
  deposited: number;
  deposited_at: string;
  method: string;
  reference: string;
  comment: string;
  status: string;
  note: string;
};

export type NotificationRow = {
  id: string;
  shop_id: string;
  kind: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
  roles: string[] | null;
};

const ROLES: RoleId[] = ['owner', 'manager', 'seller', 'stock'];
const STATUSES: MemberStatus[] = ['active', 'invited', 'suspended'];
const DEPOSIT_STATUSES: DepositStatus[] = ['pending', 'verified', 'flagged'];
const KINDS: NotificationKind[] = ['stock', 'billing', 'team', 'deposit', 'system'];

export const asRole = (value: string): RoleId => (ROLES.includes(value as RoleId) ? (value as RoleId) : 'seller');
export const asMemberStatus = (value: string): MemberStatus =>
  STATUSES.includes(value as MemberStatus) ? (value as MemberStatus) : 'active';
export const asDepositStatus = (value: string): DepositStatus =>
  DEPOSIT_STATUSES.includes(value as DepositStatus) ? (value as DepositStatus) : 'pending';
export const asNotificationKind = (value: string): NotificationKind =>
  KINDS.includes(value as NotificationKind) ? (value as NotificationKind) : 'system';

export const dayFromDate = (value: string) => Date.parse(`${value}T00:00:00+01:00`);

export function dateFromDay(day: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(day));
}

export function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    role: asRole(row.role),
    phone: row.phone,
    ...(row.email ? { email: row.email } : {}),
    shop: row.shop_scope,
    status: asMemberStatus(row.status),
    lastSeen: row.last_seen ? new Date(row.last_seen).getTime() : null,
  };
}

export function mapDeposit(row: DepositRow): Deposit {
  return {
    id: row.id,
    day: dayFromDate(row.day),
    shop: row.shop_name,
    manager: row.manager_name,
    expected: row.expected,
    deposited: row.deposited,
    depositedAt: new Date(row.deposited_at).getTime(),
    method: row.method,
    reference: row.reference,
    comment: row.comment,
    status: asDepositStatus(row.status),
    note: row.note,
  };
}

export function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    kind: asNotificationKind(row.kind),
    title: row.title,
    body: row.body,
    at: new Date(row.at).getTime(),
    read: row.read,
    href: row.href,
    ...(row.roles?.length ? { roles: row.roles.filter((role): role is RoleId => ROLES.includes(role as RoleId)) } : {}),
  };
}

export type StaffSnapshot = {
  team: Member[];
  deposits: Deposit[];
  notifications: Notification[];
};
