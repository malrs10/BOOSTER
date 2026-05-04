/**
 * Facebook API wrapper — delegates all FB operations to fb_helper.py
 * via child_process spawn. Uses curl_cffi with Chrome TLS impersonation.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { db, fbAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = path.resolve(__dirname, "../fb_helper.py");

export interface FbProfile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
  token?: string;
  authenticated?: boolean;
}

export interface FbActionResult {
  success: boolean;
  count?: number;
  total?: number;
  succeeded?: number;
  message: string;
  logs: string[];
}

export interface FbTokenResult {
  token: string;
  uid: string;
  expires: string;
  logs?: string[];
}

export interface FbAccount {
  id: number;
  uid: string;
  name: string;
  avatar: string;
  active: boolean;
  lastUsed: Date | null;
  createdAt: Date;
}

async function callPython(input: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [HELPER_PATH], { env: { ...process.env } });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    py.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    py.on("close", (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error(`Python helper failed (exit ${code}): ${stderr.slice(0, 300)}`));
        return;
      }
      try {
        const out = stdout.trim();
        if (!out) {
          reject(new Error(`Python helper returned empty output. stderr: ${stderr.slice(0, 200)}`));
          return;
        }
        const result = JSON.parse(out) as Record<string, unknown>;
        if (result.ok === false) {
          reject(new Error((result.message as string) || (result.error as string) || "Python helper error"));
          return;
        }
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse helper output: ${stdout.slice(0, 200)}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn python3: ${err.message}`));
    });

    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}

export async function getProfile(cookie: string): Promise<FbProfile> {
  const result = await callPython({ action: "login", cookie }) as FbProfile & { ok: boolean };
  return {
    uid: result.uid ?? "",
    name: result.name ?? "",
    avatar: result.avatar ?? "",
    fb_dtsg: result.fb_dtsg ?? "",
    token: result.token ?? "",
    authenticated: result.authenticated ?? false,
  };
}

export async function addReaction(
  cookie: string, postUrl: string, reactionType: string, count: number = 1
): Promise<FbActionResult> {
  const result = await callPython({ action: "react", cookie, postUrl, reactionType, count }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    count: result.count ?? 0,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function sharePost(cookie: string, postUrl: string, count: number): Promise<FbActionResult> {
  const result = await callPython({ action: "share", cookie, postUrl, count }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    count: result.count ?? 0,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function addComment(
  cookie: string, postUrl: string, comments: string[], count: number
): Promise<FbActionResult> {
  const result = await callPython({ action: "comment", cookie, postUrl, comments, count }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    count: result.count ?? 0,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function getAccessToken(cookie: string): Promise<FbTokenResult> {
  const result = await callPython({ action: "token", cookie }) as FbTokenResult & { ok: boolean };
  return {
    token: result.token ?? "",
    uid: result.uid ?? "",
    expires: result.expires ?? "",
    logs: result.logs ?? [],
  };
}

export async function enableGuard(cookie: string, enable: boolean): Promise<FbActionResult> {
  const result = await callPython({ action: "guard", cookie, enable }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function guardEmail(email: string, password: string, enable: boolean): Promise<FbActionResult & { uid?: string; name?: string }> {
  const result = await callPython({ action: "guard_email", email, password, enable }) as FbActionResult & { ok: boolean; uid?: string; name?: string };
  return {
    success: result.success ?? false,
    message: result.message ?? "",
    logs: result.logs ?? [],
    uid: result.uid,
    name: result.name,
  };
}

// ── Database account management ───────────────────────────────────────────────

export async function saveAccount(uid: string, name: string, avatar: string, cookie: string): Promise<void> {
  await db.insert(fbAccountsTable).values({ uid, name, avatar, cookie })
    .onConflictDoUpdate({
      target: fbAccountsTable.uid,
      set: { name, avatar, cookie, lastUsed: new Date() },
    });
}

export async function listAccounts(): Promise<FbAccount[]> {
  return db.select({
    id: fbAccountsTable.id,
    uid: fbAccountsTable.uid,
    name: fbAccountsTable.name,
    avatar: fbAccountsTable.avatar,
    active: fbAccountsTable.active,
    lastUsed: fbAccountsTable.lastUsed,
    createdAt: fbAccountsTable.createdAt,
  }).from(fbAccountsTable).orderBy(fbAccountsTable.createdAt) as Promise<FbAccount[]>;
}

export async function toggleAccount(uid: string, active: boolean): Promise<void> {
  await db.update(fbAccountsTable).set({ active }).where(eq(fbAccountsTable.uid, uid));
}

export async function deleteAccount(uid: string): Promise<void> {
  await db.delete(fbAccountsTable).where(eq(fbAccountsTable.uid, uid));
}

export async function getActiveCookies(): Promise<string[]> {
  const rows = await db.select({ cookie: fbAccountsTable.cookie })
    .from(fbAccountsTable)
    .where(eq(fbAccountsTable.active, true));
  return rows.map(r => r.cookie);
}

// ── Cooldown map: postUrl → last reactAll timestamp (10 min cooldown) ─────────
const reactCooldownMap = new Map<string, number>();
const REACT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// ── Per-account per-post reaction tracking (in-memory, survives restarts via reactAll skip logic) ──
// Key: `${uid}::${postUrl}::${reactionType}` → timestamp
const accountReactionLog = new Map<string, { reactionType: string; ts: number }>();

export function logAccountReaction(uid: string, postUrl: string, reactionType: string): void {
  const key = `${uid}::${postUrl.trim()}`;
  accountReactionLog.set(key, { reactionType, ts: Date.now() });
}

export function getAccountReaction(uid: string, postUrl: string): string | null {
  const key = `${uid}::${postUrl.trim()}`;
  return accountReactionLog.get(key)?.reactionType ?? null;
}

export function getReactCooldown(postUrl: string): { onCooldown: boolean; remainingMs: number; remainingSec: number } {
  const key = postUrl.trim();
  const last = reactCooldownMap.get(key) ?? 0;
  const elapsed = Date.now() - last;
  const remaining = Math.max(0, REACT_COOLDOWN_MS - elapsed);
  return { onCooldown: remaining > 0, remainingMs: remaining, remainingSec: Math.ceil(remaining / 1000) };
}

// ── Max accounts per react batch: 20 per 10-min cooldown window ──────────────
const MAX_REACT_BATCH = 20;

// ── Bulk operations using all saved accounts ──────────────────────────────────

export async function reactAll(postUrl: string, reactionType: string): Promise<FbActionResult & { cooldown?: boolean; cooldownSec?: number }> {
  const cooldown = getReactCooldown(postUrl);
  if (cooldown.onCooldown) {
    return {
      success: false,
      cooldown: true,
      cooldownSec: cooldown.remainingSec,
      message: `⏳ Cooldown active — wait ${cooldown.remainingSec}s before boosting this post again (10-min protection)`,
      logs: [`[WARN] Cooldown: ${cooldown.remainingSec}s remaining for this post`],
      total: 0,
      succeeded: 0,
    };
  }

  // Fetch all active cookies + UIDs
  const rows = await db.select({
    cookie: fbAccountsTable.cookie,
    uid: fbAccountsTable.uid,
    active: fbAccountsTable.active,
  }).from(fbAccountsTable).where(eq(fbAccountsTable.active, true));

  if (!rows.length) {
    return {
      success: false,
      message: "No saved accounts found. Login with at least one cookie first.",
      logs: [],
      total: 0,
      succeeded: 0,
    };
  }

  // Filter: skip accounts that already reacted with the SAME reaction type
  // If they reacted with a DIFFERENT type, include them so they change reaction
  const toReact = rows.filter(row => {
    const prev = getAccountReaction(row.uid, postUrl);
    if (prev === null) return true;           // never reacted → include
    if (prev !== reactionType) return true;   // different reaction → re-react
    return false;                             // same reaction → skip
  });

  if (!toReact.length) {
    return {
      success: true,
      message: `✅ All ${rows.length} accounts already reacted with ${reactionType} — nothing to do`,
      logs: [`[SKIP] All accounts already have ${reactionType} on this post`],
      total: rows.length,
      succeeded: rows.length,
    };
  }

  // Cap to MAX_REACT_BATCH (20) accounts per cooldown window
  const batch = toReact.slice(0, MAX_REACT_BATCH);
  const skippedSameReaction = rows.length - toReact.length;
  const skippedBatchLimit = toReact.length - batch.length;

  const logs: string[] = [];
  if (skippedSameReaction > 0) {
    logs.push(`[INFO] Skipped ${skippedSameReaction} account(s) — already have ${reactionType}`);
  }
  if (skippedBatchLimit > 0) {
    logs.push(`[INFO] Capped batch to ${MAX_REACT_BATCH} accounts (${skippedBatchLimit} will run next cooldown)`);
  }
  logs.push(`[INFO] Reacting with ${batch.length} account(s) → ${reactionType}`);

  // Record cooldown start
  reactCooldownMap.set(postUrl.trim(), Date.now());

  const cookies = batch.map(r => r.cookie);
  const result = await callPython({ action: "react_all", cookies, postUrl, reactionType }) as Record<string, unknown>;

  // Log successful reactions per account
  const results = (result.results as Array<{ uid?: string; success?: boolean }>) ?? [];
  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const res = results[i];
    if (res?.success !== false) {
      logAccountReaction(row.uid, postUrl, reactionType);
    }
  }

  return {
    success: (result.success as boolean) ?? false,
    count: (result.succeeded as number) ?? 0,
    total: (result.total as number) ?? 0,
    succeeded: (result.succeeded as number) ?? 0,
    message: (result.message as string) ?? "",
    logs: [...logs, ...((result.logs as string[]) ?? [])],
  };
}

export async function commentAll(postUrl: string, comments: string[], count: number): Promise<FbActionResult> {
  const cookies = await getActiveCookies();
  if (!cookies.length) {
    return {
      success: false,
      message: "No saved accounts found. Login first to save accounts.",
      logs: [],
      total: 0,
      succeeded: 0,
    };
  }
  // Cap comment batch to 20 accounts max
  const batch = cookies.slice(0, MAX_REACT_BATCH);
  const result = await callPython({ action: "comment_all", cookies: batch, postUrl, comments, count }) as Record<string, unknown>;
  return {
    success: (result.success as boolean) ?? false,
    count: (result.succeeded as number) ?? 0,
    total: (result.total as number) ?? 0,
    succeeded: (result.succeeded as number) ?? 0,
    message: (result.message as string) ?? "",
    logs: (result.logs as string[]) ?? [],
  };
}
