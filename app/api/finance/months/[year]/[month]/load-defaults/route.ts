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
    include: { entries: true },
  });
  if (!financeMonth)
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  if (financeMonth.archivedAt)
    return NextResponse.json({ error: "Month is archived" }, { status: 403 });

  // Get all active budget items (not UNPLANNED)
  const items = await prisma.financeBudgetItem.findMany({
    where: { isActive: true, NOT: { category: "UNPLANNED" } },
    orderBy: [{ category: "asc" }, { position: "asc" }],
  });

  // Find items not already in this month
  const existingItemIds = new Set(
    financeMonth.entries.filter((e) => e.itemId != null).map((e) => e.itemId!)
  );
  const missingItems = items.filter((item) => !existingItemIds.has(item.id));

  if (missingItems.length === 0) {
    const unchanged = await prisma.financeMonth.findUnique({
      where: { id: financeMonth.id },
      include: { entries: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
    });
    return NextResponse.json(unchanged);
  }

  // Carry-over amounts from previous month
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevData = await prisma.financeMonth.findUnique({
    where: { year_month: { year: prevYear, month: prevMonth } },
    include: { entries: true },
  });
  const prevAmountByItemId = new Map(
    (prevData?.entries ?? [])
      .filter((e) => e.itemId != null)
      .map((e) => [e.itemId!, parseFloat(e.amount.toString())])
  );

  const startPosition = financeMonth.entries.filter((e) => e.itemId != null).length;

  await prisma.financeBudgetEntry.createMany({
    data: missingItems.map((item, idx) => ({
      monthId: financeMonth.id,
      itemId: item.id,
      name: item.name,
      category: item.category,
      amount: prevAmountByItemId.has(item.id)
        ? prevAmountByItemId.get(item.id)!
        : item.defaultAmount != null
        ? parseFloat(item.defaultAmount.toString())
        : 0,
      payDay: item.payDay,
      position: startPosition + idx,
    })),
  });

  const updated = await prisma.financeMonth.findUnique({
    where: { id: financeMonth.id },
    include: { entries: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  return NextResponse.json(updated);
}
