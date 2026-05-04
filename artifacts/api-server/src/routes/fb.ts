import { Router, type IRouter, type Request, type Response } from "express";
import {
  getProfile,
  addReaction,
  sharePost,
  addComment,
  getAccessToken,
  enableGuard,
  guardEmail,
  saveAccount,
  listAccounts,
  toggleAccount,
  deleteAccount,
  reactAll,
  commentAll,
  getReactCooldown,
  pruneDeadAccounts,
} from "../lib/facebook.js";

const router: IRouter = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body as { cookie: string };
    if (!cookie?.trim()) {
      return res.status(400).json({ error: "MISSING_COOKIE", message: "Paste your Facebook cookie first" });
    }
    const profile = await getProfile(cookie.trim());
    if (!profile.uid) {
      return res.status(400).json({ error: "INVALID_COOKIE", message: "Could not extract UID — paste a full cookie including c_user and xs" });
    }
    // Save account to database (persist for bulk operations) — silent, non-blocking
    let dbSaved = false;
    let dbError = "";
    try {
      await saveAccount(profile.uid, profile.name, profile.avatar, cookie.trim());
      dbSaved = true;
    } catch (e: unknown) {
      dbError = e instanceof Error ? e.message : String(e);
      req.log?.warn({ err: e }, "Failed to save account to DB");
    }
    return res.json({ ...profile, dbSaved, dbError: dbSaved ? undefined : dbError });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: "LOGIN_FAILED", message: msg });
  }
});

router.post("/react", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, reactionType, count = 1 } = req.body as {
      cookie: string; postUrl: string; reactionType: string; count?: number;
    };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });
    if (!reactionType)    return res.status(400).json({ error: "MISSING_REACTION", message: "Reaction type required" });

    const clampedCount = Math.min(Math.max(Number(count) || 1, 1), 100);
    const result = await addReaction(cookie.trim(), postUrl.trim(), reactionType, clampedCount);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "REACT_FAILED", message: msg });
  }
});

router.get("/react/cooldown", async (req: Request, res: Response) => {
  try {
    const { postUrl } = req.query as { postUrl?: string };
    if (!postUrl) return res.json({ onCooldown: false, remainingSec: 0 });
    return res.json(getReactCooldown(postUrl));
  } catch {
    return res.json({ onCooldown: false, remainingSec: 0 });
  }
});

router.post("/react/all", async (req: Request, res: Response) => {
  try {
    const { postUrl, reactionType } = req.body as { postUrl: string; reactionType: string };
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });
    if (!reactionType)    return res.status(400).json({ error: "MISSING_REACTION", message: "Reaction type required" });

    const result = await reactAll(postUrl.trim(), reactionType);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "REACT_ALL_FAILED", message: msg });
  }
});

router.post("/share", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, count = 1 } = req.body as { cookie: string; postUrl: string; count?: number };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });

    const result = await sharePost(cookie.trim(), postUrl.trim(), Number(count) || 1);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "SHARE_FAILED", message: msg });
  }
});

router.post("/comment", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, comments, count = 1 } = req.body as {
      cookie: string; postUrl: string; comments: string[]; count?: number;
    };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });
    if (!comments?.length) return res.status(400).json({ error: "MISSING_COMMENTS", message: "At least one comment required" });

    const result = await addComment(cookie.trim(), postUrl.trim(), comments, Math.min(Number(count) || 1, 50));
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "COMMENT_FAILED", message: msg });
  }
});

router.post("/comment/all", async (req: Request, res: Response) => {
  try {
    const { postUrl, comments, count = 1 } = req.body as {
      postUrl: string; comments: string[]; count?: number;
    };
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });
    if (!comments?.length) return res.status(400).json({ error: "MISSING_COMMENTS", message: "At least one comment required" });

    const result = await commentAll(postUrl.trim(), comments, Math.min(Number(count) || 1, 50));
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "COMMENT_ALL_FAILED", message: msg });
  }
});

router.post("/token", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body as { cookie: string };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });

    const result = await getAccessToken(cookie.trim());
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "TOKEN_FAILED", message: msg });
  }
});

router.post("/guard", async (req: Request, res: Response) => {
  try {
    const { cookie, enable = true } = req.body as { cookie: string; enable?: boolean };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });

    const result = await enableGuard(cookie.trim(), Boolean(enable));
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "GUARD_FAILED", message: msg });
  }
});

router.post("/guard/email", async (req: Request, res: Response) => {
  try {
    const { email, password, enable = true } = req.body as { email: string; password: string; enable?: boolean };
    if (!email?.trim()) return res.status(400).json({ error: "MISSING_EMAIL", message: "Email required" });
    if (!password)      return res.status(400).json({ error: "MISSING_PASSWORD", message: "Password required" });

    const result = await guardEmail(email.trim(), password, Boolean(enable));
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "GUARD_EMAIL_FAILED", message: msg });
  }
});

router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const accounts = await listAccounts();
    return res.json(accounts);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "ACCOUNTS_FAILED", message: msg });
  }
});

router.patch("/accounts/:uid", async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    const { active } = req.body as { active: boolean };
    await toggleAccount(uid, Boolean(active));
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "TOGGLE_FAILED", message: msg });
  }
});

router.delete("/accounts/:uid", async (req: Request, res: Response) => {
  try {
    const uid = String(req.params.uid);
    await deleteAccount(uid);
    return res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "DELETE_FAILED", message: msg });
  }
});

// Auto-prune all dead (expired) accounts by verifying each cookie against Facebook
router.post("/accounts/prune", async (_req: Request, res: Response) => {
  try {
    const result = await pruneDeadAccounts();
    return res.json({
      success: true,
      removed: result.removed,
      kept: result.kept,
      removedNames: result.removedNames,
      message: result.removed > 0
        ? `🗑️ Removed ${result.removed} dead account(s): ${result.removedNames.join(", ")}`
        : `✅ All ${result.kept} accounts are alive and active`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "PRUNE_FAILED", message: msg });
  }
});

export default router;
