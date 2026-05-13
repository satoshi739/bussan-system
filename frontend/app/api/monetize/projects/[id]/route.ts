import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateProjectInput } from "@/lib/monetize/inputValidation";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

async function loadProject(id: string, userId: string) {
  return prisma.monetizeProject.findFirst({
    where: { id, userId },
  });
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await prisma.monetizeProject.findFirst({
    where: { id, userId: session.user.id },
    include: {
      latestResult: true,
      histories: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await loadProject(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
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

  const updated = await prisma.monetizeProject.update({
    where: { id },
    data: {
      name: data.name,
      genre: data.genre,
      target: data.target,
      productUrl: data.productUrl,
      lpUrl: data.lpUrl,
      blogUrl: data.blogUrl,
      affiliateLink: data.affiliateLink,
      memo: data.memo,
    },
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await loadProject(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  await prisma.monetizeProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
