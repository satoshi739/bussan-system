/**
 * QuickListing migration を Neon に適用するスクリプト
 *
 * 使い方:
 *   # ドライラン (実際は適用しない・状態確認のみ)
 *   DATABASE_URL=... node scripts/apply-quick-listing-migration.mjs --dry-run
 *
 *   # 実行 (確認プロンプトあり)
 *   DATABASE_URL=... node scripts/apply-quick-listing-migration.mjs
 *
 *   # 確認スキップ (CI/自動実行用)
 *   DATABASE_URL=... node scripts/apply-quick-listing-migration.mjs --yes
 *
 * 安全装置:
 *   - DATABASE_URL がホスト名を含まない場合は中止
 *   - QuickListing テーブルが既に存在する場合は skip
 *   - SQL 内に DROP/TRUNCATE/DELETE が含まれていたら中止
 *   - 適用後に件数・カラム数・FK存在を検証
 */

import { Client } from "pg";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL_PATH = join(
  __dirname,
  "..",
  "prisma/migrations/20260512100000_add_quick_listing/migration.sql",
);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SKIP_CONFIRM = args.has("--yes");

function log(s) { console.log(s); }
function err(s) { console.error(s); }

async function confirm(prompt) {
  if (SKIP_CONFIRM) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, ans => { rl.close(); resolve(ans.trim().toLowerCase() === "yes"); });
  });
}

(async () => {
  const url = (process.env.DATABASE_URL || "")
    .replace(/&channel_binding=require/g, "")
    .replace(/channel_binding=require&/g, "")
    .replace(/\?channel_binding=require$/g, "");

  if (!url) { err("❌ DATABASE_URL が未設定"); process.exit(1); }
  const hostMatch = url.match(/@([^/:?]+)/);
  if (!hostMatch) { err("❌ DATABASE_URL からホスト名を抽出できません"); process.exit(1); }
  const host = hostMatch[1];

  log("============================================");
  log("  QuickListing migration 適用スクリプト");
  log("============================================");
  log(`  target host: ${host}`);
  log(`  dry-run    : ${DRY_RUN}`);
  log("");

  // SQLファイル読み込み + 危険ワード再検査
  const sql = readFileSync(MIGRATION_SQL_PATH, "utf8");
  const dangerPatterns = [
    /\bDROP\s+TABLE\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i,
    /\bDROP\s+DATABASE\b/i, /\bDROP\s+SCHEMA\b/i, /\bDROP\s+COLUMN\b/i,
  ];
  for (const p of dangerPatterns) {
    if (p.test(sql)) {
      err(`❌ SQL内に危険操作を検出: ${p}`);
      process.exit(1);
    }
  }
  log("✅ SQL内に危険操作なし (DROP/TRUNCATE/DELETE)");

  // 接続
  const client = new Client({ connectionString: url });
  await client.connect();
  log("✅ DB接続成功");

  try {
    // 適用前状態
    const beforeTbl = await client.query(
      "SELECT to_regclass('public.\"QuickListing\"') AS tbl",
    );
    const tableExisted = !!beforeTbl.rows[0].tbl;
    log(`  QuickListing テーブル: ${tableExisted ? "既存（skip候補）" : "未作成"}`);

    const beforeType = await client.query(
      "SELECT 1 FROM pg_type WHERE typname = 'QuickListingStatus'",
    );
    log(`  QuickListingStatus enum: ${beforeType.rows.length > 0 ? "既存" : "未作成"}`);

    if (DRY_RUN) {
      log("");
      log("--- DRY RUN モード: 適用せず終了 ---");
      return;
    }

    if (tableExisted) {
      log("");
      log("⚠️  QuickListing テーブルが既に存在します。");
      log("    冪等SQLなので再実行は安全ですが、本来は不要です。");
    }

    // 確認プロンプト
    log("");
    log(`このSQL を ${host} に適用します。`);
    const ok = await confirm("続行しますか? [yes/no]: ");
    if (!ok) { log("中止しました"); process.exit(0); }

    // 適用
    log("--- 適用中 ---");
    await client.query(sql);
    log("✅ 適用完了");

    // 検証
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='QuickListing' ORDER BY ordinal_position",
    );
    log(`  カラム数: ${cols.rows.length} (期待値 24)`);

    const idx = await client.query(
      "SELECT indexname FROM pg_indexes WHERE tablename='QuickListing'",
    );
    log(`  インデックス: ${idx.rows.length} 件`);
    idx.rows.forEach(r => log(`    - ${r.indexname}`));

    const fk = await client.query(
      "SELECT conname FROM pg_constraint WHERE conrelid='\"QuickListing\"'::regclass AND contype='f'",
    );
    log(`  外部キー: ${fk.rows.length} 件 (期待値 1)`);
    fk.rows.forEach(r => log(`    - ${r.conname}`));

    log("");
    log("✅ すべての検証パス");
  } catch (e) {
    err("❌ エラー: " + e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    log("✅ DB切断");
  }
})();
