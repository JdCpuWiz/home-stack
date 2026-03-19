import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/email-digest/clear — mark the active digest as cleared (archives it)
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await prisma.emailDigest.findFirst({
    where: { clearedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (!active) {
    return NextResponse.json({ error: "No active digest to clear" }, { status: 404 });
  }

  const cleared = await prisma.emailDigest.update({
    where: { id: active.id },
    data: { clearedAt: new Date() },
  });

  return NextResponse.json(cleared);
}
