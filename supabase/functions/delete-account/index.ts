// Deletes the signed-in user's account (privacy policy + App Store requirement).
// The service key stays here, server-side; the client only sends its own session token.
// Deleting the auth user cascades to profiles and everything that references it.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
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
    console.error('delete-account', data.user.id, deleteError.message);
    return Response.json({ error: 'OUTLY_DELETE_FAILED' }, { status: 500, headers: cors });
  }
  return Response.json({ deleted: true }, { headers: cors });
});
