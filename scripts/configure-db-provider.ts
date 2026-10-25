/**
 * Point Prisma at Postgres when DATABASE_URL is a postgres URL.
 * Used by the daily ingest Action so one schema file works locally (SQLite)
 * and in production (hosted Postgres).
 */
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const url = process.env.DATABASE_URL ?? "";
const schema = fs.readFileSync(schemaPath, "utf8");

if (/^postgres(ql)?:\/\//i.test(url)) {
  if (!schema.includes('provider = "sqlite"')) {
    console.log("Prisma schema is already not sqlite; leaving as-is.");
    process.exit(0);
  }
  fs.writeFileSync(schemaPath, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
  console.log("Prisma provider set to postgresql for DATABASE_URL.");
} else if (url.startsWith("file:")) {
  console.log("Prisma provider remains sqlite (local / CI smoke).");
} else if (!url) {
  console.error("DATABASE_URL is empty. Set file:./dev.db locally or a Postgres URL in production.");
  process.exit(1);
} else {
  console.warn(`Unrecognized DATABASE_URL scheme; leaving Prisma provider unchanged.`);
}
