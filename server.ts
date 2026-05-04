// ╔══════════════════════════════════════════════════════════════════╗
// ║  server.ts — RPW BOOSTER · Central Server Config               ║
// ║                                                                  ║
// ║  STEP 1: Set SERVER_URL to your Render deployment URL below      ║
// ║  STEP 2: Run:  pnpm server:sync                                  ║
// ║           → Updates vercel.json API rewrites                     ║
// ║           → Updates mobile EXPO_PUBLIC_API_URL                   ║
// ║           → Updates GitHub Actions APK build URL                 ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── EDIT THIS LINE AFTER DEPLOYING TO RENDER ─────────────────────────────────
export const SERVER_URL = "https://rpw-boosterxd.onrender.com";
// ─────────────────────────────────────────────────────────────────────────────

// ── Script mode: run with "pnpm server:sync" to propagate URL everywhere ─────
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const root = __dirname;
  const url = SERVER_URL.replace(/\/$/, "");

  console.log(`\n🔧  RPW BOOSTER — syncing server URL: ${url}\n`);

  // 1. vercel.json
  const vercelPath = resolve(root, "vercel.json");
  const vercel = JSON.parse(readFileSync(vercelPath, "utf8"));
  vercel.rewrites = [
    { source: "/api/(.*)", destination: `${url}/api/$1` },
  ];
  writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + "\n");
  console.log(`  ✓  vercel.json  →  ${url}/api/*`);

  // 2. Mobile .env
  const mobileEnvPath = resolve(root, "artifacts/rpw-mobile/.env");
  writeFileSync(mobileEnvPath, `EXPO_PUBLIC_API_URL=${url}/api/fb\n`);
  console.log(`  ✓  artifacts/rpw-mobile/.env  →  ${url}/api/fb`);

  // 3. GitHub Actions APK workflow
  const workflowPath = resolve(root, ".github/workflows/android-apk.yml");
  let workflow = readFileSync(workflowPath, "utf8");
  workflow = workflow.replace(
    /EXPO_PUBLIC_API_URL:.*$/m,
    `EXPO_PUBLIC_API_URL: ${url}/api/fb`,
  );
  writeFileSync(workflowPath, workflow);
  console.log(`  ✓  .github/workflows/android-apk.yml  →  ${url}/api/fb`);

  console.log("\n✅  All configs synced! Commit and push to apply.\n");
}
