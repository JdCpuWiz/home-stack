import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { isSubscriptionDueInMonth } from "@/lib/subscriptionUtils";

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

  // ── Budget items ─────────────────────────────────────────────────
  const items = await prisma.financeBudgetItem.findMany({
    where: { isActive: true, NOT: { category: "UNPLANNED" } },
    orderBy: [{ category: "asc" }, { position: "asc" }],
  });

  const existingItemIds = new Set(
    financeMonth.entries.filter((e) => e.itemId != null).map((e) => e.itemId!)
  );
  const missingItems = items.filter((item) => !existingItemIds.has(item.id));

  // ── Subscriptions due this month ─────────────────────────────────
  const allSubs = await prisma.subscription.findMany({ where: { isActive: true } });
  const subsDue = allSubs.filter((s) =>
    isSubscriptionDueInMonth(s.renewalDate, s.frequency, year, month)
  );
  const existingSubIds = new Set(
    financeMonth.entries.filter((e) => e.subscriptionId != null).map((e) => e.subscriptionId!)
  );
  const missingSubs = subsDue.filter((s) => !existingSubIds.has(s.id));

  if (missingItems.length === 0 && missingSubs.length === 0) {
    const unchanged = await prisma.financeMonth.findUnique({
      where: { id: financeMonth.id },
      include: { entries: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
    });
    return NextResponse.json(unchanged);
  }

  // Carry-over amounts from previous month (for budget items)
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

  const newItemData = missingItems.map((item, idx) => ({
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
  }));

  const subStartPosition = startPosition + missingItems.length;
  const newSubData = missingSubs.map((sub, idx) => ({
    monthId: financeMonth.id,
    subscriptionId: sub.id,
    name: sub.name,
    category: "SUBSCRIPTIONS" as const,
    amount: parseFloat(sub.cost.toString()),
    payDay: parseInt(sub.renewalDate.toISOString().slice(8, 10)),
    position: subStartPosition + idx,
  }));

  await prisma.financeBudgetEntry.createMany({
    data: [...newItemData, ...newSubData],
  });

  const updated = await prisma.financeMonth.findUnique({
    where: { id: financeMonth.id },
    include: { entries: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  return NextResponse.json(updated);
}
