import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from './logger';

export const isSupabaseConfigured = (): boolean => {
  return (
    !!env.SUPABASE_URL &&
    !env.SUPABASE_URL.includes('your-supabase-project') &&
    !env.SUPABASE_URL.includes('placeholder.supabase.co') &&
    !!env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key') &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  );
};

export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

if (!isSupabaseConfigured()) {
  logger.warn('⚠️ Supabase credentials are using placeholder values. Set real credentials in .env to connect to PostgreSQL & Storage.');
}
