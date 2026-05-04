import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const GH_REPO = "malrs10/BOOSTER";
const GH_API  = `https://api.github.com/repos/${GH_REPO}/releases/latest`;

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

router.get("/latest", async (_req: Request, res: Response) => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }

    const r = await fetch(GH_API, {
      headers: {
        "User-Agent": "RPW-BOOSTER-API",
        "Accept": "application/vnd.github+json",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "GitHub API error", status: r.status });
    }

    const raw = await r.json() as {
      tag_name: string;
      name: string;
      html_url: string;
      published_at: string;
      assets: Array<{ name: string; download_count: number; browser_download_url: string }>;
    };

    const totalDownloads = (raw.assets ?? []).reduce(
      (sum, a) => sum + (a.download_count ?? 0),
      0,
    );

    const data = {
      tag:       raw.tag_name,
      name:      raw.name,
      url:       raw.html_url,
      downloads: totalDownloads,
      publishedAt: raw.published_at,
      assets: (raw.assets ?? []).map((a) => ({
        name:      a.name,
        downloads: a.download_count,
        url:       a.browser_download_url,
      })),
    };

    cache = { data, ts: Date.now() };
    return res.json(data);
  } catch (_err) {
    return res.status(500).json({ error: "Failed to fetch release info" });
  }
});

export default router;
