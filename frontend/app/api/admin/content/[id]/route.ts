import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") return false;
  return true;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { platform, theme, title, body, status, publishedAt } = await req.json();
  const item = await prisma.contentItem.update({
    where: { id },
    data: { platform, theme, title, body, status, publishedAt: publishedAt ? new Date(publishedAt) : null },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.contentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
