import { User } from '@supabase/supabase-js';

export interface AuthUserInfo {
  id: string;
  email: string | undefined;
  role: string | undefined;
  createdAt: string;
}

export const getAuthenticatedUserInfo = (user: User): AuthUserInfo => {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
};
