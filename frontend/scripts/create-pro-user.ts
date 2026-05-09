/**
 * プロプランユーザー作成スクリプト
 * 実行: npx tsx scripts/create-pro-user.ts
 * 環境変数 TARGET_EMAIL で対象メールを指定可能
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.TARGET_EMAIL ?? "tohyokoyama1204to@gmail.com";

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true },
  });

  if (existing) {
    // 既存ユーザーのプランをPROに更新
    if (existing.subscription) {
      await prisma.subscription.update({
        where: { userId: existing.id },
        data: { plan: "PRO", status: "ACTIVE" },
      });
    } else {
      await prisma.subscription.create({
        data: { userId: existing.id, plan: "PRO", status: "ACTIVE" },
      });
    }
    console.log(`✅ プロプランに設定: ${existing.email} (id: ${existing.id})`);
  } else {
    // ユーザー新規作成（初回ログイン前の事前登録）
    const created = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        role: "USER",
        subscription: {
          create: { plan: "PRO", status: "ACTIVE" },
        },
      },
    });
    console.log(`✅ プロプランユーザー作成: ${created.email} (id: ${created.id})`);
    console.log("   ※ マジックリンクでログインするとこのアカウントと紐付きます");
  }
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
