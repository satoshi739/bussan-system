/**
 * プロプランユーザー作成スクリプト
 * 実行: npx tsx scripts/create-pro-user.ts
 * 環境変数:
 *   TARGET_EMAIL    対象メール (省略時は既定値)
 *   TARGET_PASSWORD 指定すると bcrypt でハッシュ化して passwordHash に設定
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.TARGET_EMAIL ?? "tohyokoyama1204to@gmail.com";
  const password = process.env.TARGET_PASSWORD;
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

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
    if (passwordHash) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash },
      });
    }
    console.log(`✅ プロプランに設定: ${existing.email} (id: ${existing.id})${passwordHash ? " / passwordHash更新" : ""}`);
  } else {
    // ユーザー新規作成（初回ログイン前の事前登録）
    const created = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        role: "USER",
        ...(passwordHash ? { passwordHash } : {}),
        subscription: {
          create: { plan: "PRO", status: "ACTIVE" },
        },
      },
    });
    console.log(`✅ プロプランユーザー作成: ${created.email} (id: ${created.id})${passwordHash ? " / passwordHash設定済み" : ""}`);
    if (!passwordHash) {
      console.log("   ※ マジックリンクでログインするとこのアカウントと紐付きます");
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
