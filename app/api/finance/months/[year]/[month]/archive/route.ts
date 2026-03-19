import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year: y, month: m } = await params;
  const year = parseInt(y);
  const month = parseInt(m);

  const existing = await prisma.financeMonth.findUnique({
    where: { year_month: { year, month } },
  });
  if (!existing)
    return NextResponse.json({ error: "Month not found" }, { status: 404 });

  // Toggle archive state
  const updated = await prisma.financeMonth.update({
    where: { id: existing.id },
    data: { archivedAt: existing.archivedAt ? null : new Date() },
    include: { entries: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  return NextResponse.json(updated);
}
