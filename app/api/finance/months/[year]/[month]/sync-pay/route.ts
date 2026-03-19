import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { fetchTimesheetNetPay } from "@/lib/timesheetClient";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  if (!(await isAuthorized(request)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { year: y, month: m } = await params;
  const year = parseInt(y);
  const month = parseInt(m);

  const timesheetNetPay = await fetchTimesheetNetPay(year, month);
  if (timesheetNetPay === null) {
    return NextResponse.json({ available: false, timesheetNetPay: null });
  }

  const existing = await prisma.financeMonth.findUnique({
    where: { year_month: { year, month } },
  });

  if (!existing) {
    return NextResponse.json({ available: true, timesheetNetPay, conflict: false });
  }

  const storedNetPay =
    existing.netPay != null ? parseFloat(existing.netPay.toString()) : null;

  // Conflict: manually set value that differs from timesheet
  if (
    existing.netPayIsManual &&
    storedNetPay !== null &&
    Math.abs(storedNetPay - timesheetNetPay) > 0.005
  ) {
    return NextResponse.json({
      available: true,
      timesheetNetPay,
      conflict: true,
      currentNetPay: storedNetPay,
    });
  }

  // No conflict — update automatically
  await prisma.financeMonth.update({
    where: { id: existing.id },
    data: { netPay: timesheetNetPay, netPayIsManual: false },
  });

  return NextResponse.json({ available: true, timesheetNetPay, conflict: false });
}
