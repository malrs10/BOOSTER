/**
 * Facebook API wrapper — delegates all FB operations to fb_helper.py
 *
 * Storage strategy:
 *   • DATABASE_URL set   → PostgreSQL via drizzle ORM
 *   • DATABASE_URL unset → JSON file at /tmp/rpw_accounts.json (always works on Render)
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

// Static DB imports — db is null when DATABASE_URL is not set (handled by lib/db)
import { db, fbAccountsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = path.resolve(__dirname, "../fb_helper.py");

// ── JSON file store (fallback when db is null) ────────────────────────────────
const STORE_PATH = process.env["ACCOUNTS_STORE_PATH"] || "/tmp/rpw_accounts.json";

interface StoredAccount {
  id: number;
  uid: string;
  name: string;
  avatar: string;
  cookie: string;
  active: boolean;
  lastUsed: string | null;
  createdAt: string;
}

function readStore(): StoredAccount[] {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf8").trim();
      if (raw) return JSON.parse(raw) as StoredAccount[];
    }
  } catch { /* corrupt — reset */ }
  return [];
}

function writeStore(accounts: StoredAccount[]): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(accounts, null, 2), "utf8");
  } catch (e) {
    console.error("[store] write failed:", e instanceof Error ? e.message : String(e));
  }
}

function storeUpsert(uid: string, name: string, avatar: string, cookie: string): void {
  const accounts = readStore();
  const idx = accounts.findIndex(a => a.uid === uid);
  const now = new Date().toISOString();
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], name, avatar, cookie, lastUsed: now };
  } else {
    const maxId = accounts.reduce((m, a) => Math.max(m, a.id), 0);
    accounts.push({ id: maxId + 1, uid, name, avatar, cookie, active: true, lastUsed: now, createdAt: now });
  }
  writeStore(accounts);
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  lastUsed: Date | string | null;
  createdAt: Date | string;
}

// ── Python helper ─────────────────────────────────────────────────────────────

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
        if (!out) { reject(new Error(`Python helper empty output. stderr: ${stderr.slice(0, 200)}`)); return; }
        const result = JSON.parse(out) as Record<string, unknown>;
        if (result.ok === false) {
          reject(new Error((result.message as string) || (result.error as string) || "Python helper error"));
          return;
        }
        resolve(result);
      } catch {
        reject(new Error(`Failed to parse helper output: ${stdout.slice(0, 200)}`));
      }
    });

    py.on("error", (err) => reject(new Error(`Failed to spawn python3: ${err.message}`)));
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}

// ── FB actions ────────────────────────────────────────────────────────────────

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

export async function addReaction(cookie: string, postUrl: string, reactionType: string, count = 1): Promise<FbActionResult> {
  const result = await callPython({ action: "react", cookie, postUrl, reactionType, count }) as FbActionResult & { ok: boolean };
  return { success: result.success ?? false, count: result.count ?? 0, message: result.message ?? "", logs: result.logs ?? [] };
}

export async function sharePost(cookie: string, postUrl: string, count: number): Promise<FbActionResult> {
  const result = await callPython({ action: "share", cookie, postUrl, count }) as FbActionResult & { ok: boolean };
  return { success: result.success ?? false, count: result.count ?? 0, message: result.message ?? "", logs: result.logs ?? [] };
}

export async function addComment(cookie: string, postUrl: string, comments: string[], count: number): Promise<FbActionResult> {
  const result = await callPython({ action: "comment", cookie, postUrl, comments, count }) as FbActionResult & { ok: boolean };
  return { success: result.success ?? false, count: result.count ?? 0, message: result.message ?? "", logs: result.logs ?? [] };
}

export async function getAccessToken(cookie: string): Promise<FbTokenResult> {
  const result = await callPython({ action: "token", cookie }) as FbTokenResult & { ok: boolean };
  return { token: result.token ?? "", uid: result.uid ?? "", expires: result.expires ?? "", logs: result.logs ?? [] };
}

export async function enableGuard(cookie: string, enable: boolean): Promise<FbActionResult> {
  const result = await callPython({ action: "guard", cookie, enable }) as FbActionResult & { ok: boolean };
  return { success: result.success ?? false, message: result.message ?? "", logs: result.logs ?? [] };
}

export async function guardEmail(email: string, password: string, enable: boolean): Promise<FbActionResult & { uid?: string; name?: string }> {
  const result = await callPython({ action: "guard_email", email, password, enable }) as FbActionResult & { ok: boolean; uid?: string; name?: string };
  return { success: result.success ?? false, message: result.message ?? "", logs: result.logs ?? [], uid: result.uid, name: result.name };
}

// ── Account management (PostgreSQL → file fallback) ───────────────────────────

export async function saveAccount(uid: string, name: string, avatar: string, cookie: string): Promise<void> {
  if (db) {
    await db.insert(fbAccountsTable).values({ uid, name, avatar, cookie })
      .onConflictDoUpdate({ target: fbAccountsTable.uid, set: { name, avatar, cookie, lastUsed: new Date() } });
  } else {
    storeUpsert(uid, name, avatar, cookie);
  }
}

export async function listAccounts(): Promise<FbAccount[]> {
  if (db) {
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
  return readStore();
}

export async function toggleAccount(uid: string, active: boolean): Promise<void> {
  if (db) {
    await db.update(fbAccountsTable).set({ active }).where(eq(fbAccountsTable.uid, uid));
  } else {
    const accounts = readStore();
    const idx = accounts.findIndex(a => a.uid === uid);
    if (idx >= 0) { accounts[idx].active = active; writeStore(accounts); }
  }
}

export async function deleteAccount(uid: string): Promise<void> {
  if (db) {
    await db.delete(fbAccountsTable).where(eq(fbAccountsTable.uid, uid));
  } else {
    writeStore(readStore().filter(a => a.uid !== uid));
  }
}

export async function deleteAccounts(uids: string[]): Promise<void> {
  if (!uids.length) return;
  if (db) {
    await db.delete(fbAccountsTable).where(inArray(fbAccountsTable.uid, uids));
  } else {
    const set = new Set(uids);
    writeStore(readStore().filter(a => !set.has(a.uid)));
  }
}

async function getActiveRows(): Promise<{ uid: string; cookie: string }[]> {
  if (db) {
    return db.select({ uid: fbAccountsTable.uid, cookie: fbAccountsTable.cookie })
      .from(fbAccountsTable)
      .where(eq(fbAccountsTable.active, true)) as Promise<{ uid: string; cookie: string }[]>;
  }
  return readStore().filter(a => a.active).map(a => ({ uid: a.uid, cookie: a.cookie }));
}

// ── Internal: get all accounts including cookie (never exposed to frontend) ───
async function getAllWithCookies(): Promise<{ uid: string; name: string; cookie: string }[]> {
  if (db) {
    return db.select({ uid: fbAccountsTable.uid, name: fbAccountsTable.name, cookie: fbAccountsTable.cookie })
      .from(fbAccountsTable) as Promise<{ uid: string; name: string; cookie: string }[]>;
  }
  return readStore().map(a => ({ uid: a.uid, name: a.name, cookie: a.cookie }));
}

// ── Prune dead accounts ───────────────────────────────────────────────────────
export async function pruneDeadAccounts(): Promise<{ removed: number; kept: number; removedNames: string[] }> {
  const all = await getAllWithCookies();
  if (!all.length) return { removed: 0, kept: 0, removedNames: [] };

  const checks = await Promise.allSettled(
    all.map(async (row) => {
      try {
        const result = await callPython({ action: "login", cookie: row.cookie }) as { ok: boolean; authenticated?: boolean };
        return { uid: row.uid, name: row.name || row.uid, alive: result.ok !== false && result.authenticated === true };
      } catch {
        return { uid: row.uid, name: row.name || row.uid, alive: false };
      }
    })
  );

  const dead = checks
    .map(r => r.status === "fulfilled" ? r.value : null)
    .filter((r): r is { uid: string; name: string; alive: boolean } => r !== null && !r.alive);

  if (dead.length) await deleteAccounts(dead.map(d => d.uid));
  return { removed: dead.length, kept: all.length - dead.length, removedNames: dead.map(d => d.name) };
}

// ── Cooldown + reaction tracking ─────────────────────────────────────────────
const reactCooldownMap = new Map<string, number>();
const REACT_COOLDOWN_MS = 10 * 60 * 1000;
const accountReactionLog = new Map<string, { reactionType: string; ts: number }>();
const MAX_REACT_BATCH = 20;

export function logAccountReaction(uid: string, postUrl: string, reactionType: string): void {
  accountReactionLog.set(`${uid}::${postUrl.trim()}`, { reactionType, ts: Date.now() });
}

export function getAccountReaction(uid: string, postUrl: string): string | null {
  return accountReactionLog.get(`${uid}::${postUrl.trim()}`)?.reactionType ?? null;
}

export function getReactCooldown(postUrl: string): { onCooldown: boolean; remainingMs: number; remainingSec: number } {
  const last = reactCooldownMap.get(postUrl.trim()) ?? 0;
  const remaining = Math.max(0, REACT_COOLDOWN_MS - (Date.now() - last));
  return { onCooldown: remaining > 0, remainingMs: remaining, remainingSec: Math.ceil(remaining / 1000) };
}

// ── Bulk react ────────────────────────────────────────────────────────────────
export async function reactAll(postUrl: string, reactionType: string): Promise<FbActionResult & { cooldown?: boolean; cooldownSec?: number; removedDead?: number }> {
  const cooldown = getReactCooldown(postUrl);
  if (cooldown.onCooldown) {
    return {
      success: false, cooldown: true, cooldownSec: cooldown.remainingSec,
      message: `⏳ Cooldown active — wait ${cooldown.remainingSec}s before boosting this post again`,
      logs: [`[WARN] Cooldown: ${cooldown.remainingSec}s remaining`], total: 0, succeeded: 0,
    };
  }

  const rows = await getActiveRows();
  if (!rows.length) {
    return { success: false, message: "No saved accounts. Login with at least one cookie first.", logs: [], total: 0, succeeded: 0 };
  }

  const toReact = rows.filter(r => {
    const prev = getAccountReaction(r.uid, postUrl);
    return prev === null || prev !== reactionType;
  });

  if (!toReact.length) {
    return { success: true, message: `✅ All ${rows.length} accounts already reacted with ${reactionType}`, logs: [], total: rows.length, succeeded: rows.length };
  }

  const batch = toReact.slice(0, MAX_REACT_BATCH);
  const logs: string[] = [];
  if (rows.length - toReact.length > 0) logs.push(`[INFO] Skipped ${rows.length - toReact.length} account(s) — already have ${reactionType}`);
  if (toReact.length - batch.length > 0) logs.push(`[INFO] Capped to ${MAX_REACT_BATCH} accounts (${toReact.length - batch.length} queued for next cooldown)`);
  logs.push(`[INFO] Reacting with ${batch.length} account(s) → ${reactionType}`);

  reactCooldownMap.set(postUrl.trim(), Date.now());
  const result = await callPython({ action: "react_all", cookies: batch.map(r => r.cookie), postUrl, reactionType }) as Record<string, unknown>;

  const results = (result.results as Array<{ uid?: string; success?: boolean; dead?: boolean }>) ?? [];
  const deadUids: string[] = [];
  for (let i = 0; i < batch.length; i++) {
    const res = results[i] ?? {};
    if (res.dead === true) deadUids.push(res.uid || batch[i].uid);
    else if (res.success !== false) logAccountReaction(batch[i].uid, postUrl, reactionType);
  }
  if (deadUids.length) {
    try { await deleteAccounts(deadUids); logs.push(`[INFO] 🗑️ Auto-removed ${deadUids.length} dead/expired account(s)`); } catch { /* silent */ }
  }

  return {
    success: (result.success as boolean) ?? false,
    count: (result.succeeded as number) ?? 0,
    total: (result.total as number) ?? 0,
    succeeded: (result.succeeded as number) ?? 0,
    message: (result.message as string) ?? "",
    logs: [...logs, ...((result.logs as string[]) ?? [])],
    removedDead: deadUids.length,
  };
}

// ── Bulk comment ──────────────────────────────────────────────────────────────
export async function commentAll(postUrl: string, comments: string[], count: number): Promise<FbActionResult & { removedDead?: number }> {
  const rows = await getActiveRows();
  if (!rows.length) {
    return { success: false, message: "No saved accounts. Login first.", logs: [], total: 0, succeeded: 0 };
  }

  const batch = rows.slice(0, MAX_REACT_BATCH);
  const result = await callPython({ action: "comment_all", cookies: batch.map(r => r.cookie), postUrl, comments, count }) as Record<string, unknown>;

  const results = (result.results as Array<{ uid?: string; success?: boolean; dead?: boolean }>) ?? [];
  const deadUids: string[] = [];
  for (let i = 0; i < batch.length; i++) {
    const res = results[i] ?? {};
    if (res.dead === true) deadUids.push(res.uid || batch[i].uid);
  }

  const logs: string[] = (result.logs as string[]) ?? [];
  if (deadUids.length) {
    try { await deleteAccounts(deadUids); logs.push(`[INFO] 🗑️ Auto-removed ${deadUids.length} dead/expired account(s)`); } catch { /* silent */ }
  }

  return {
    success: (result.success as boolean) ?? false,
    count: (result.succeeded as number) ?? 0,
    total: (result.total as number) ?? 0,
    succeeded: (result.succeeded as number) ?? 0,
    message: (result.message as string) ?? "",
    logs, removedDead: deadUids.length,
  };
}
