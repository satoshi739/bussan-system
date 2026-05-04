const { Pool } = require("pg");

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const tables = [
  {
    name: "ActiveSession",
    sql: `CREATE TABLE IF NOT EXISTS "ActiveSession" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "sessionKey" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    name: "ActiveSession_sessionKey_idx",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "ActiveSession_sessionKey_key" ON "ActiveSession"("sessionKey")`,
  },
  {
    name: "PurchaseRecord",
    sql: `CREATE TABLE IF NOT EXISTS "PurchaseRecord" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "buyPrice" DOUBLE PRECISION NOT NULL,
      "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "otherFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "sellPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "memo" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    name: "SaleRecord",
    sql: `CREATE TABLE IF NOT EXISTS "SaleRecord" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "sellPrice" DOUBLE PRECISION NOT NULL,
      "buyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "profit" DOUBLE PRECISION NOT NULL,
      "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "memo" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SaleRecord_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    name: "ScanHistory",
    sql: `CREATE TABLE IF NOT EXISTS "ScanHistory" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "keyword" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "resultsCount" INTEGER NOT NULL DEFAULT 0,
      "topRoi" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "topProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    name: "ProfitCalcHistory",
    sql: `CREATE TABLE IF NOT EXISTS "ProfitCalcHistory" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "buyPrice" DOUBLE PRECISION NOT NULL,
      "sellPrice" DOUBLE PRECISION NOT NULL,
      "profit" DOUBLE PRECISION NOT NULL,
      "roi" DOUBLE PRECISION NOT NULL,
      "platform" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProfitCalcHistory_pkey" PRIMARY KEY ("id")
    )`,
  },
];

const foreignKeys = [
  { name: "ActiveSession_userId_fkey", table: "ActiveSession" },
  { name: "PurchaseRecord_userId_fkey", table: "PurchaseRecord" },
  { name: "SaleRecord_userId_fkey", table: "SaleRecord" },
  { name: "ScanHistory_userId_fkey", table: "ScanHistory" },
  { name: "ProfitCalcHistory_userId_fkey", table: "ProfitCalcHistory" },
];

async function run() {
  for (const t of tables) {
    await pool.query(t.sql);
    console.log(`Table ready: ${t.name}`);
  }

  for (const fk of foreignKeys) {
    const exists = await pool.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1`,
      [fk.name]
    );
    if (exists.rowCount === 0) {
      await pool.query(
        `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      );
      console.log(`FK added: ${fk.name}`);
    }
  }

  console.log("All migrations done.");
}

run()
  .then(() => pool.end())
  .catch((e) => {
    console.error("Migration error:", e.message);
    pool.end();
    process.exit(1);
  });
