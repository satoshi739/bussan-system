import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "パスワードは6文字以上で入力してください" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      // メールリンクで登録済みのユーザーにパスワードを追加
      await prisma.user.update({ where: { email }, data: { passwordHash } });
    } else {
      const user = await prisma.user.create({
        data: { email, name: email.split("@")[0], passwordHash },
      });
      try {
        await prisma.subscription.create({
          data: { userId: user.id, plan: "FREE", status: "ACTIVE" },
        });
      } catch { /* already exists */ }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
