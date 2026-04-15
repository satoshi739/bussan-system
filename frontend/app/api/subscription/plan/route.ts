import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ plan: "FREE" });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { subscription: true },
  });

  return NextResponse.json({
    plan: user?.subscription?.plan ?? "FREE",
    status: user?.subscription?.status ?? "INACTIVE",
  });
}
