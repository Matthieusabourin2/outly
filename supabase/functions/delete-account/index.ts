// Deletes the signed-in user's account (privacy policy + App Store requirement).
// The service key stays here, server-side; the client only sends its own session token.
// Deleting the auth user cascades to profiles and everything that references it.
//
// Security: only Outly's own websites may call it from a browser. Set the secret
// ALLOWED_ORIGINS (comma-separated, e.g. "https://outlysydney.com") in production;
// without it, only localhost origins are accepted (local development).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowed(origin: string | null): boolean {
  if (!origin) return true; // not a browser request (no CORS involved); the token check still applies
  return allowedOrigins.length > 0 ? allowedOrigins.includes(origin) : LOCAL_ORIGIN.test(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (origin && isAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }
  return headers;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin);
  if (!isAllowed(origin)) return Response.json({ error: 'OUTLY_FORBIDDEN' }, { status: 403, headers: cors });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'OUTLY_AUTH_REQUIRED' }, { status: 401, headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: 'OUTLY_AUTH_REQUIRED' }, { status: 401, headers: cors });

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error('delete-account failed', data.user.id, deleteError.message);
    return Response.json({ error: 'OUTLY_DELETE_FAILED' }, { status: 500, headers: cors });
  }
  return Response.json({ deleted: true }, { headers: cors });
});
