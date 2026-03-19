import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { fetchTimesheetNetPay } from "@/lib/timesheetClient";

const ENTRY_ORDER = { orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }] };

async function getOrCreateMonth(year: number, month: number) {
  const existing = await prisma.financeMonth.findUnique({
    where: { year_month: { year, month } },
    include: { entries: ENTRY_ORDER },
  });

  // If month exists but has no non-UNPLANNED entries, check if items now exist
  // and re-seed if so (handles case where page was first visited before items were set up)
  if (existing) {
    const hasSeededEntries = existing.entries.some((e) => e.itemId != null);
    if (!hasSeededEntries) {
      const itemCount = await prisma.financeBudgetItem.count({
        where: { isActive: true, NOT: { category: "UNPLANNED" } },
      });
      if (itemCount > 0) {
        // Delete and re-create so the seed logic below runs fresh
        await prisma.financeMonth.delete({ where: { id: existing.id } });
      } else {
        return existing;
      }
    } else {
      return existing;
    }
  }

  // Seed from active budget items (skip UNPLANNED — those are ad-hoc)
  const items = await prisma.financeBudgetItem.findMany({
    where: { isActive: true, NOT: { category: "UNPLANNED" } },
    orderBy: [{ category: "asc" }, { position: "asc" }],
  });

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

  // Try timesheet for net pay
  const timesheetNetPay = await fetchTimesheetNetPay(year, month);

  return prisma.financeMonth.create({
    data: {
      year,
      month,
      netPay: timesheetNetPay ?? null,
      netPayIsManual: false,
      entries: {
        create: items.map((item, idx) => ({
          itemId: item.id,
          name: item.name,
          category: item.category,
          amount: prevAmountByItemId.has(item.id)
            ? prevAmountByItemId.get(item.id)!
            : item.defaultAmount != null
            ? parseFloat(item.defaultAmount.toString())
            : 0,
          payDay: item.payDay,
          position: idx,
        })),
      },
    },
    include: { entries: ENTRY_ORDER },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year: y, month: m } = await params;
  const year = parseInt(y);
  const month = parseInt(m);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const data = await getOrCreateMonth(year, month);
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year: y, month: m } = await params;
  const year = parseInt(y);
  const month = parseInt(m);
  const body = await request.json();
  const { netPay, netPayIsManual } = body;

  const updated = await prisma.financeMonth.update({
    where: { year_month: { year, month } },
    data: {
      ...(netPay != null && { netPay: parseFloat(netPay) }),
      ...(netPayIsManual != null && { netPayIsManual }),
    },
    include: { entries: ENTRY_ORDER },
  });
  return NextResponse.json(updated);
}
