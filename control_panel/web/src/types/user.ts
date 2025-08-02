import { UserState } from "../slices/user";

export type Profile = Omit<UserState, "accessToken">;

export type User = {
  fist_name: string;
  last_name: string;
  email: string;
  is_root: boolean;
  available_scopes: string[];
  available_api_namespaces: string[];
};

export type UserCreationRequest = Profile & {
  password: string;
  password2: string;
};

export type UserCreateRequest = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password2: string;
  roles?: (string | undefined)[] | null;
  assigned_scopes?: (string | undefined)[] | null;
  scopes: string[];
};

export type UserUpdateRequest = {
  email: string;
  first_name: string;
  last_name: string;
  password?: string | null;
  password2?: string | null;
  roles?: (string | undefined)[] | null;
  assigned_scopes?: (string | undefined)[] | null;
  scopes: string[];
  is_root: boolean;
};

export type PasswordChangeRequest = {
  old_password: string;
  new_password: string;
};
