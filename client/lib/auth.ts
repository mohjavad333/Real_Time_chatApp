import type { AuthResponse, ChatUser } from "@shared/api";

const sessionKey = "loop.auth.session";

/**
 * Fired when an authenticated API call is rejected with 401 (expired/invalid
 * token). The app listens for this to clear the session and return to /auth.
 */
export const sessionExpiredEvent = "loop:session-expired";

export function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent(sessionExpiredEvent));
}

type AuthSession = AuthResponse;

async function request(path: string, body: unknown) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  let data: { message?: string } & Partial<AuthSession>;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { message: responseText || "Authentication failed" };
  }
  if (!response.ok) throw new Error(data.message ?? "Authentication failed");
  return data as AuthSession;
}

/**
 * fetch() wrapper for authenticated API calls. When the server answers 401
 * (e.g. the 7-day JWT expired), the stale session is dropped and the app is
 * redirected to the login page instead of failing with cryptic errors.
 */
export async function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) {
    authClient.logout();
    notifySessionExpired();
  }
  return response;
}

export const authClient = {
  register: (body: { name: string; email: string; password: string }) => request("register", body),
  login: (body: { email: string; password: string }) => request("login", body),
  saveSession(session: AuthSession) { localStorage.setItem(sessionKey, JSON.stringify(session)); },
  getSession(): AuthSession | null {
    const raw = localStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  },
  getUser(): ChatUser | null { return this.getSession()?.user ?? null; },
  logout() { localStorage.removeItem(sessionKey); },
};
