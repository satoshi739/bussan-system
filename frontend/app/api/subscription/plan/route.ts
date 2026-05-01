import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ plan: "FREE", status: "INACTIVE" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    plan: sub?.plan ?? "FREE",
    status: sub?.status ?? "INACTIVE",
  });
}
