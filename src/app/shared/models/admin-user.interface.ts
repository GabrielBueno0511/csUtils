export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  user_metadata: Record<string, unknown>;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  last_sign_in_at: string | null;
  is_anonymous: boolean;
  spots_created: number;
}
