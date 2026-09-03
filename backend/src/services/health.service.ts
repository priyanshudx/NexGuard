import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
}

export interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
  database: DatabaseStatus;
}

export const getHealthStatus = async (): Promise<HealthStatus> => {
  const configured = isSupabaseConfigured();
  let connected = false;
  let errorMsg: string | undefined;

  if (configured) {
    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      if (error) {
        errorMsg = error.message;
      } else {
        connected = true;
      }
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : 'Unknown database connection error';
    }
  } else {
    errorMsg = 'Supabase credentials not configured';
  }

  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      configured,
      connected,
      ...(errorMsg ? { error: errorMsg } : {}),
    },
  };
};
