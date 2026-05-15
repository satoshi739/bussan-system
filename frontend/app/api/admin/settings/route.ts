import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/app-settings";
import { encryptValue, maskValue, decryptValue } from "@/lib/crypto-settings";

export const runtime = "nodejs";

// GET: 全設定をマスク表示で返す
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const known = Object.values(SETTING_KEYS);
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: known.map((k) => k.key) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const items = known.map((meta) => {
    const rec = byKey.get(meta.key);
    let masked = "";
    let hasValue = false;
    if (rec) {
      hasValue = true;
      const plain = rec.secret ? decryptValue(rec.value) : rec.value;
      masked = meta.secret ? maskValue(plain) : plain;
    }
    return {
      key: meta.key,
      label: meta.label,
      group: meta.group,
      secret: meta.secret,
      hasValue,
      maskedValue: masked,
      updatedAt: rec?.updatedAt ?? null,
      updatedBy: rec?.updatedBy ?? null,
    };
  });

  return NextResponse.json({ items });
}

// PUT: 指定キーの値を保存（plaintext で受け、必要なら暗号化して格納）
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { key: string; value: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.key || typeof body.value !== "string") {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const meta = Object.values(SETTING_KEYS).find((k) => k.key === body.key);
  if (!meta) {
    return NextResponse.json({ error: "unknown key" }, { status: 400 });
  }

  const stored = meta.secret ? encryptValue(body.value) : body.value;

  await prisma.appSetting.upsert({
    where: { key: body.key },
    create: {
      key: body.key,
      value: stored,
      secret: meta.secret,
      description: meta.label,
      updatedBy: session.user.id,
    },
    update: {
      value: stored,
      secret: meta.secret,
      description: meta.label,
      updatedBy: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: キー削除
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  await prisma.appSetting.delete({ where: { key } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
