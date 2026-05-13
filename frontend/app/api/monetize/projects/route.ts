import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateProjectInput } from "@/lib/monetize/inputValidation";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.monetizeProject.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      genre: true,
      target: true,
      status: true,
      latestGeneratedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { errors, data } = validateProjectInput(body);
  if (errors || !data) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const created = await prisma.monetizeProject.create({
    data: {
      userId: session.user.id,
      name: data.name,
      genre: data.genre,
      target: data.target,
      productUrl: data.productUrl,
      lpUrl: data.lpUrl,
      blogUrl: data.blogUrl,
      affiliateLink: data.affiliateLink,
      memo: data.memo,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ project: created }, { status: 201 });
}
