export type AuthRequest = {
  email: string;
  password: string;
  rememberme: boolean;
};

export type AuthResponse = {
  token: string;
};

