import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@outly/db';

/** Browser client. Publishable key only — the service role key never reaches the admin bundle. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
