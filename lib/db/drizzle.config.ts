import { defineConfig } from "drizzle-kit";
import path from "path";

const url = process.env["DATABASE_URL"];

if (!url) {
  console.warn("[drizzle-kit] DATABASE_URL not set — skipping schema push");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "postgresql://localhost/placeholder",
  },
});
