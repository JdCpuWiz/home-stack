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

  const financeMonth = await prisma.financeMonth.findUnique({
    where: { year_month: { year, month } },
  });
  if (!financeMonth)
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  if (financeMonth.archivedAt)
    return NextResponse.json({ error: "Month is archived" }, { status: 403 });

  // Delete all entries that came from budget items (keep UNPLANNED ad-hoc entries)
  await prisma.financeBudgetEntry.deleteMany({
    where: { monthId: financeMonth.id, itemId: { not: null } },
  });

  const updated = await prisma.financeMonth.findUnique({
    where: { id: financeMonth.id },
    include: { entries: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  return NextResponse.json(updated);
}
