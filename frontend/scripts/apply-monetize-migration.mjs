import { Client } from "pg";
import { readFileSync } from "node:fs";

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Usage: node apply-monetize-migration.mjs <sqlFilePath>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();
    console.log("[ok] Connected to Neon.");

    const before = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'monetize%' ORDER BY table_name",
    );
    console.log("[before] monetize_* tables:", before.rows.map((r) => r.table_name).join(", ") || "(none)");

    await client.query(sql);
    console.log("[ok] SQL executed successfully.");

    const after = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'monetize%' ORDER BY table_name",
    );
    console.log("[after] monetize_* tables:", after.rows.map((r) => r.table_name).join(", "));

    const enums = await client.query(
      "SELECT typname FROM pg_type WHERE typname IN ('project_status','generation_history_status') ORDER BY typname",
    );
    console.log("[after] enums:", enums.rows.map((r) => r.typname).join(", "));

    const fks = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid::regclass::text LIKE 'monetize_%'
      ORDER BY conname
    `);
    console.log("[after] foreign keys (count=" + fks.rows.length + "):", fks.rows.map((r) => r.conname).join(", "));
  } catch (e) {
    console.error("[error]", e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log("[ok] Disconnected.");
  }
})();
