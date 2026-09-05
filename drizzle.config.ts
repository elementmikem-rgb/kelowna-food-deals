import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  schemaFilter: ["specials"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
