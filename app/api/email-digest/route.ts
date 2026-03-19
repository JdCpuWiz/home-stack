import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

// GET /api/email-digest — return the active digest and recent history
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [active, history] = await Promise.all([
    prisma.emailDigest.findFirst({
      where: { clearedAt: null },
      orderBy: { startedAt: "desc" },
    }),
    prisma.emailDigest.findMany({
      where: { clearedAt: { not: null } },
      orderBy: { clearedAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({ active, history });
}
