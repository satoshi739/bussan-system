import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ plan: "FREE", status: "INACTIVE" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  if (user?.role === "ADMIN") {
    return NextResponse.json({ plan: "PRO", status: "ACTIVE" });
  }

  const sub = user?.subscription;
  return NextResponse.json({
    plan: sub?.plan ?? "FREE",
    status: sub?.status ?? "INACTIVE",
  });
}
