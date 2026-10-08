import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type { Database } from './types';
export type OutlyClient = SupabaseClient<Database>;

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

/** Fields the apps may list for a venue. Never includes commission or Stripe data. */
export const VENUE_LIST_COLUMNS = 'id, name, partner_status, categories, vibe_tags, is_demo' as const;
