export type AuthSession = {
  userId: string;
  accessToken: string;
};

export const authStorageKey = "loop.auth.session";
