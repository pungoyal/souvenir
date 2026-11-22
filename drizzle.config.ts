import { defineConfig } from "drizzle-kit";

// Only `drizzle-kit generate` runs here, which diffs the schema against ./drizzle and never
// connects; migrations are applied by scripts/migrate.ts with the real DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});
