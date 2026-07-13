import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./electron/db/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./forge-db.db",
  },
});
