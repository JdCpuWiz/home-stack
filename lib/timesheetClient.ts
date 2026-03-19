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
  if (!timesheetUrl) {
    console.warn("[timesheetClient] TIMESHEET_URL is not set");
    return null;
  }

  const apiKey = process.env.TIMESHEET_API_KEY;
  const headers: HeadersInit = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {};

  try {
    const paddedMonth = String(month).padStart(2, "0");
    const targetStartDate = `${year}-${paddedMonth}-15`;
    console.log(`[timesheetClient] fetching periods from ${timesheetUrl}/api/pay-periods, looking for start_date=${targetStartDate}`);

    const periodsRes = await fetch(`${timesheetUrl}/api/pay-periods`, {
      signal: AbortSignal.timeout(5000),
      headers,
    });
    if (!periodsRes.ok) {
      console.warn(`[timesheetClient] /api/pay-periods returned ${periodsRes.status}`);
      return null;
    }

    const periods: Array<{ id: number; start_date: string }> =
      await periodsRes.json();

    console.log(`[timesheetClient] got ${periods.length} periods, first start_dates:`, periods.slice(0, 3).map(p => p.start_date));

    const period = periods.find(
      (p) => p.start_date && p.start_date.substring(0, 10) === targetStartDate
    );
    if (!period) {
      console.warn(`[timesheetClient] no period found with start_date=${targetStartDate}`);
      return null;
    }

    const payRes = await fetch(
      `${timesheetUrl}/api/pay-periods/${period.id}/pay`,
      { signal: AbortSignal.timeout(5000), headers }
    );
    if (!payRes.ok) {
      console.warn(`[timesheetClient] /pay returned ${payRes.status} for period ${period.id}`);
      return null;
    }

    const payData = await payRes.json();
    console.log(`[timesheetClient] netPay=${payData.netPay}`);
    return typeof payData.netPay === "number" ? payData.netPay : null;
  } catch (err) {
    console.error("[timesheetClient] fetch error:", err);
    return null;
  }
}
