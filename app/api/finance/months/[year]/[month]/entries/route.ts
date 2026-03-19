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
  const body = await request.json();
  const { name, amount, category, payDay, notes } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const financeMonth = await prisma.financeMonth.findUnique({
    where: { year_month: { year, month } },
  });
  if (!financeMonth)
    return NextResponse.json({ error: "Month not found" }, { status: 404 });

  const entryCount = await prisma.financeBudgetEntry.count({
    where: { monthId: financeMonth.id, category: category ?? "UNPLANNED" },
  });

  const entry = await prisma.financeBudgetEntry.create({
    data: {
      monthId: financeMonth.id,
      name: name.trim(),
      category: category ?? "UNPLANNED",
      amount: parseFloat(amount) || 0,
      payDay: payDay ? parseInt(payDay) : null,
      notes: notes?.trim() || null,
      position: entryCount,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
