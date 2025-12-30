export type UserStats = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  email_verified: boolean;
  created_at: string;
  last_login: string | null;
  deck_count: number;
  reading_count: number;
  storage_bytes: number;
};
