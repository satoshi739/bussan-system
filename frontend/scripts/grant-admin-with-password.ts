/**
 * 指定メールのユーザーを ADMIN に昇格 + パスワードログインを有効化するスクリプト。
 * 既存ユーザーなら更新、未登録なら新規作成する。
 *
 * 実行例:
 *   ADMIN_EMAIL=aiki7644@gmail.com ADMIN_PASSWORD_PLAIN=aiki1234 \
 *     npx tsx scripts/grant-admin-with-password.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD_PLAIN;

  if (!email || !password) {
    console.error("❌ ADMIN_EMAIL と ADMIN_PASSWORD_PLAIN を指定してください");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", passwordHash },
    });
    console.log(`✅ 既存ユーザーを ADMIN 化 + パスワード更新: ${updated.email} (id: ${updated.id})`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        role: "ADMIN",
        passwordHash,
        subscription: { create: { plan: "PRO", status: "ACTIVE" } },
      },
    });
    console.log(`✅ 新規 ADMIN ユーザー作成: ${created.email} (id: ${created.id})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
