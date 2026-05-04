const BASE = "/api/fb";

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || data.error || `HTTP ${r.status}`);
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || data.error || `HTTP ${r.status}`);
  return data as T;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || data.error || `HTTP ${r.status}`);
  return data as T;
}

export interface FbProfile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
  token?: string;
  authenticated?: boolean;
}

export interface ActionResult {
  success: boolean;
  count?: number;
  total?: number;
  succeeded?: number;
  message: string;
  logs?: string[];
  cooldown?: boolean;
  cooldownSec?: number;
}

export interface TokenResult {
  token: string;
  uid: string;
  expires: string;
  logs?: string[];
}

export interface SavedAccount {
  id: number;
  uid: string;
  name: string;
  avatar: string;
  active: boolean;
  lastUsed: string | null;
  createdAt: string;
}

export const api = {
  login: (cookie: string) => post<FbProfile>("/login", { cookie }),

  react: (cookie: string, postUrl: string, reactionType: string, count = 1) =>
    post<ActionResult>("/react", { cookie, postUrl, reactionType, count }),

  reactAll: (postUrl: string, reactionType: string) =>
    post<ActionResult>("/react/all", { postUrl, reactionType }),

  share: (cookie: string, postUrl: string, count: number) =>
    post<ActionResult>("/share", { cookie, postUrl, count }),

  comment: (cookie: string, postUrl: string, comments: string[], count: number) =>
    post<ActionResult>("/comment", { cookie, postUrl, comments, count }),

  commentAll: (postUrl: string, comments: string[], count: number) =>
    post<ActionResult>("/comment/all", { postUrl, comments, count }),

  token: (cookie: string) =>
    post<TokenResult>("/token", { cookie }),

  guard: (cookie: string, enable: boolean) =>
    post<ActionResult>("/guard", { cookie, enable }),

  guardEmail: (email: string, password: string, enable: boolean) =>
    post<ActionResult & { uid?: string; name?: string }>("/guard/email", { email, password, enable }),

  getAccounts: () => get<SavedAccount[]>("/accounts"),

  toggleAccount: (uid: string, active: boolean) =>
    patch<{ success: boolean }>(`/accounts/${uid}`, { active }),
};
