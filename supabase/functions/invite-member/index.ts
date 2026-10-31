// Invite a staff member: create/link an auth user and a shop_members row (ADR 0011).
// POST JSON { name, email, phone, role, shopScope } with the owner's access token.
// Secrets: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (injected). Optional PUBLIC_SITE_URL
// for the invite redirect (defaults to the request Origin).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = new Set(['manager', 'seller', 'stock']);

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(401, { error: 'not-signed-in' });

  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) return json(401, { error: 'not-signed-in' });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return json(400, { error: 'invalid-body' });

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = normalizeEmail(body.email);
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const role = typeof body.role === 'string' ? body.role : '';
  const shopScope = typeof body.shopScope === 'string' && body.shopScope.trim() ? body.shopScope.trim() : 'Toutes';

  if (name.split(/\s+/).length < 2) return json(400, { error: 'invalid-name' });
  if (!email) return json(400, { error: 'invalid-email' });
  if (!ROLES.has(role)) return json(400, { error: 'invalid-role' });

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (shopError || !shop) return json(403, { error: 'forbidden' });

  const origin = Deno.env.get('PUBLIC_SITE_URL') || req.headers.get('Origin') || '';
  const redirectTo = origin ? `${origin.replace(/\/$/, '')}/connexion` : undefined;

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name, phone: phone || null, invited_shop_id: shop.id },
    redirectTo,
  });

  if (inviteError) {
    const message = inviteError.message.toLowerCase();
    if (message.includes('already') || message.includes('registered') || inviteError.status === 422) {
      return json(409, { error: 'account-exists' });
    }
    console.error('inviteUserByEmail', inviteError);
    return json(500, { error: 'invite-failed' });
  }

  const userId = invited.user?.id;
  if (!userId) return json(500, { error: 'invite-failed' });

  // Invite trigger may create an empty shop for the new user — remove it; staff belong to the owner's shop.
  await admin.from('shops').delete().eq('owner_id', userId);

  const { data: member, error: memberError } = await admin
    .from('shop_members')
    .insert({
      shop_id: shop.id,
      user_id: userId,
      name,
      email,
      phone,
      role,
      shop_scope: shopScope,
      status: 'invited',
    })
    .select('*')
    .single();

  if (memberError || !member) {
    console.error('shop_members insert', memberError);
    // Avoid orphan auth users that block a later re-invite (account-exists).
    await admin.auth.admin.deleteUser(userId);
    return json(500, { error: 'member-failed' });
  }

  return json(200, { member });
});
