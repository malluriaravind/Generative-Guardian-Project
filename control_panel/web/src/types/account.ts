export type Account = {
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  available_scopes: string[] | undefined;
  scopes: string[] | null;
  is_root: boolean;
};
