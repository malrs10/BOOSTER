# RPW BOOSTER

## Overview

Facebook multi-tool suite with web dashboard, mobile app (Expo), and Express API backend.
pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 22
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`fb_accounts` table)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS (lara-web)
- **Mobile**: Expo React Native (rpw-mobile)

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| `lara-web` | `/` | React/Vite web dashboard for FB tools |
| `api-server` | `/api` | Express backend + Python `fb_helper.py` for FB ops |
| `rpw-mobile` | `/rpw-mobile/` | Expo React Native mobile app |

## GitHub

- **Repo**: https://github.com/malrs10/BOOSTER
- **APK workflow**: triggers on every push to `main`, builds universal APK and creates a GitHub Release
- **APK compatibility**: arm64-v8a + armeabi-v7a + x86_64 (universal, all devices)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/lara-web run dev` — run web frontend locally

## Reaction System Logic

- `POST /api/fb/react/all` — reacts using all saved active accounts
- **Per-account dedup**: if an account already reacted with the SAME type → skip. If reaction type changed → re-react.
- **20-account cap**: max 20 accounts per batch per 10-minute cooldown window
- **10-min cooldown**: enforced per post URL, prevents suspension
- Accounts are auto-saved to DB on every login — never displayed to user, only used for bulk operations

## Deployment

### Render (render.yaml) — Zero Config
- `render.yaml` provisions everything automatically: web service + PostgreSQL DB
- DB migrations run on startup automatically
- Installs Python deps (curl_cffi, requests) for fb_helper.py
- API runs at `/api`, frontend at `/`
- No env vars to set manually — DATABASE_URL and SESSION_SECRET are auto-generated

### APK (GitHub Actions: .github/workflows/android-apk.yml)
- Triggers on push to `main` or manual dispatch
- Builds universal APK (arm64-v8a + armeabi-v7a + x86_64) — works on ANY Android device
- R8 minify + resource shrinking for smaller file size
- Creates GitHub Release with APK attached
- Default API URL: `https://rpw-boosterxd.onrender.com/api/fb` (change after Render deployment)

## Architecture Notes

- `fb_helper.py` is a Python script (uses `curl_cffi` for Chrome TLS impersonation) called via child_process from the Node.js API server
- `HELPER_PATH` resolves relative to the compiled `dist/` directory — in production, `fb_helper.py` must be one level above `dist/`
- The API server serves the built lara-web frontend as static files from `../public` (relative to dist/) in production
- Accounts stored in `fb_accounts` PostgreSQL table (uid, name, avatar, cookie, active, lastUsed, createdAt)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
