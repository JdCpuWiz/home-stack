/**
 * Server-side helper for fetching net pay from the Timesheet app.
 * Pay periods run 15th → 14th; the relevant period for a finance month
 * is the one starting on the 15th of that month (paid on the 25th).
 */
export async function fetchTimesheetNetPay(
  year: number,
  month: number
): Promise<number | null> {
  const timesheetUrl = process.env.TIMESHEET_URL;
  if (!timesheetUrl) return null;

  try {
    const paddedMonth = String(month).padStart(2, "0");
    const targetStartDate = `${year}-${paddedMonth}-15`;

    const periodsRes = await fetch(`${timesheetUrl}/api/pay-periods`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!periodsRes.ok) return null;

    const periods: Array<{ id: number; start_date: string }> =
      await periodsRes.json();

    const period = periods.find(
      (p) => p.start_date && p.start_date.substring(0, 10) === targetStartDate
    );
    if (!period) return null;

    const payRes = await fetch(
      `${timesheetUrl}/api/pay-periods/${period.id}/pay`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    );
    if (!payRes.ok) return null;

    const payData = await payRes.json();
    return typeof payData.netPay === "number" ? payData.netPay : null;
  } catch {
    return null;
  }
}
