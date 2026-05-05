import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") return false;
  return true;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const items = await prisma.contentItem.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { platform, theme, title, body } = await req.json();
  if (!platform || !title || !body) return NextResponse.json({ error: "platform/title/body is required" }, { status: 400 });
  const item = await prisma.contentItem.create({ data: { platform, theme: theme ?? "", title, body } });
  return NextResponse.json(item, { status: 201 });
}
