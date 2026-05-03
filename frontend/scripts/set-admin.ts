/**
 * マスターアカウント設定スクリプト
 * 実行: npx tsx scripts/set-admin.ts
 * 環境変数 ADMIN_EMAIL で対象メールを上書き可能（デフォルト: satoshi6667s@gmail.com）
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "satoshi6667s@gmail.com";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // 既存ユーザーを ADMIN に昇格
    const updated = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log(`✅ ADMIN に昇格: ${updated.email} (id: ${updated.id})`);
  } else {
    // ユーザーが存在しない場合は事前作成（初回ログイン前の準備）
    const created = await prisma.user.create({
      data: {
        email,
        role: "ADMIN",
        subscription: {
          create: { plan: "PRO", status: "ACTIVE" },
        },
      },
    });
    console.log(`✅ ADMIN ユーザー作成: ${created.email} (id: ${created.id})`);
    console.log("   ※ マジックリンクでログインすると既存アカウントと紐付きます");
  }
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
