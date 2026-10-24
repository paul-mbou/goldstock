// Second sign-in factor: a 6-digit code emailed to the account owner, valid 10 minutes.
// POST { action: 'send' } or { action: 'verify', code } with the user's access token.
// Secrets: RESEND_API_KEY, EMAIL_FROM, EMAIL_OTP_SECRET (SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected by Supabase).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const encoder = new TextEncoder();

async function hashCode(sessionId: string, code: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(Deno.env.get('EMAIL_OTP_SECRET')!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${sessionId}:${code}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Uniform 6-digit code: rejection sampling avoids the modulo bias of a plain `% 1e6`. */
function generateCode() {
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= 4_294_000_000);
  return String(buffer[0] % 1_000_000).padStart(6, '0');
}

async function sendEmail(to: string, code: string) {
  const text = [
    'Bonjour,',
    '',
    `Votre code de connexion GOLDSTOCK : ${code}`,
    '',
    `Il expire dans ${CODE_TTL_MINUTES} minutes. Ne le communiquez à personne, même à notre équipe.`,
    'Si vous n’êtes pas à l’origine de cette demande, changez votre mot de passe.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#0b1426">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
        <tr><td style="font-size:18px;font-weight:800;letter-spacing:.04em;color:#0b1426">GOLD<span style="color:#d99a0b">STOCK</span></td></tr>
        <tr><td style="padding-top:24px;font-size:16px;line-height:1.5">Voici votre code de connexion&nbsp;:</td></tr>
        <tr><td style="padding:16px 0;font-size:36px;font-weight:800;letter-spacing:.3em;color:#0b1426">${code}</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#4a5568">Il expire dans ${CODE_TTL_MINUTES} minutes. Ne le communiquez à personne, même à notre équipe.<br>Si vous n’êtes pas à l’origine de cette demande, changez votre mot de passe.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM'),
      to: [to],
      subject: `${code} est votre code de connexion GOLDSTOCK`,
      text,
      html,
    }),
  });
  if (!response.ok) console.error('Resend error', response.status, await response.text());
  return response.ok;
}

async function send(userId: string, sessionId: string, email: string) {
  const now = Date.now();
  const { data: recent, error } = await admin
    .from('email_otp_challenges')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(now - 3_600_000).toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (recent.length > 0) {
    const sinceLast = (now - Date.parse(recent[0].created_at)) / 1000;
    if (sinceLast < RESEND_COOLDOWN_SECONDS)
      return json(429, { error: 'rate-limited', retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLast) });
  }
  if (recent.length >= MAX_CODES_PER_HOUR) {
    const oldest = Date.parse(recent[recent.length - 1].created_at);
    return json(429, { error: 'rate-limited', retryAfter: Math.ceil((oldest + 3_600_000 - now) / 1000) });
  }

  await admin
    .from('email_otp_challenges')
    .update({ consumed_at: new Date(now).toISOString() })
    .eq('session_id', sessionId)
    .is('consumed_at', null);

  const code = generateCode();
  const { data: challenge, error: insertError } = await admin
    .from('email_otp_challenges')
    .insert({
      user_id: userId,
      session_id: sessionId,
      code_hash: await hashCode(sessionId, code),
      expires_at: new Date(now + CODE_TTL_MINUTES * 60_000).toISOString(),
    })
    .select('id')
    .single();
  // Foreign-key violation: the auth session was signed out after this token was issued.
  if (insertError?.code === '23503') return json(401, { error: 'not-signed-in' });
  if (insertError) throw insertError;

  if (!(await sendEmail(email, code))) {
    await admin.from('email_otp_challenges').delete().eq('id', challenge.id);
    return json(502, { error: 'email-failed' });
  }
  return json(200, { ok: true, expiresInMinutes: CODE_TTL_MINUTES, retryAfter: RESEND_COOLDOWN_SECONDS });
}

async function verify(userId: string, sessionId: string, code: unknown) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return json(400, { error: 'invalid-code' });

  const { data: challenge, error } = await admin
    .from('email_otp_challenges')
    .select('id, code_hash, attempts, expires_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!challenge || Date.parse(challenge.expires_at) < Date.now()) return json(400, { error: 'expired' });
  if (challenge.attempts >= MAX_ATTEMPTS) return json(429, { error: 'too-many-attempts' });

  if (!timingSafeEqual(await hashCode(sessionId, code), challenge.code_hash)) {
    const attempts = challenge.attempts + 1;
    await admin
      .from('email_otp_challenges')
      .update({ attempts, ...(attempts >= MAX_ATTEMPTS && { consumed_at: new Date().toISOString() }) })
      .eq('id', challenge.id)
      .eq('attempts', challenge.attempts);
    return attempts >= MAX_ATTEMPTS
      ? json(429, { error: 'too-many-attempts' })
      : json(400, { error: 'invalid-code', attemptsLeft: MAX_ATTEMPTS - attempts });
  }

  const { data: consumed, error: consumeError } = await admin
    .from('email_otp_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', challenge.id)
    .is('consumed_at', null)
    .select('id');
  if (consumeError) throw consumeError;
  if (consumed.length === 0) return json(400, { error: 'expired' });

  const { error: verifyError } = await admin
    .from('verified_sessions')
    .upsert({ session_id: sessionId, user_id: userId, verified_at: new Date().toISOString() });
  if (verifyError?.code === '23503') return json(401, { error: 'not-signed-in' });
  if (verifyError) throw verifyError;

  return json(200, { ok: true });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not-signed-in' });

  const { data, error } = await admin.auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub || !claims.session_id || !claims.email) return json(401, { error: 'not-signed-in' });

  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === 'send') return await send(claims.sub, claims.session_id as string, claims.email as string);
    if (body.action === 'verify') return await verify(claims.sub, claims.session_id as string, body.code);
    return json(400, { error: 'bad-request' });
  } catch (cause) {
    console.error(cause);
    return json(500, { error: 'unknown' });
  }
});
