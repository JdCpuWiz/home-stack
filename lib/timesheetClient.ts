/**
 * Server-side helper for fetching net pay from the Timesheet app.
 * Uses Node's native http/https module to avoid Next.js fetch patching issues.
 * Pay periods run 15th → 14th; the relevant period for a finance month
 * is the one starting on the 15th of that month (paid on the 25th).
 */

import http from "node:http";
import https from "node:https";

function nodeGet(url: string, headers: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers,
        timeout: 5000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk: Buffer) => (raw += chunk.toString()));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error("Invalid JSON response"));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

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
  const headers: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {};

  try {
    const paddedMonth = String(month).padStart(2, "0");
    const targetStartDate = `${year}-${paddedMonth}-15`;
    console.log(`[timesheetClient] fetching periods from ${timesheetUrl}/api/pay-periods, looking for start_date=${targetStartDate}`);

    const periodsRaw = await nodeGet(`${timesheetUrl}/api/pay-periods`, headers);
    console.log("[timesheetClient] periodsRaw type:", typeof periodsRaw, "isArray:", Array.isArray(periodsRaw));
    console.log("[timesheetClient] periodsRaw keys:", periodsRaw && typeof periodsRaw === "object" ? Object.keys(periodsRaw as object).join(",") : String(periodsRaw));

    // Handle both bare array and { success, data: [] } envelope
    const periods: Array<{ id: number; start_date: string }> = Array.isArray(periodsRaw)
      ? (periodsRaw as Array<{ id: number; start_date: string }>)
      : (periodsRaw as { data?: Array<{ id: number; start_date: string }> })?.data ?? [];

    if (!Array.isArray(periods) || periods.length === 0) {
      console.warn("[timesheetClient] periods is empty or not an array");
      return null;
    }

    console.log(`[timesheetClient] got ${periods.length} periods, checking for ${targetStartDate}`);

    const period = periods.find(
      (p) => p.start_date && p.start_date.substring(0, 10) === targetStartDate
    );
    if (!period) {
      console.warn(`[timesheetClient] no period found with start_date=${targetStartDate}`);
      return null;
    }

    const payRaw = await nodeGet(`${timesheetUrl}/api/pay-periods/${period.id}/pay`, headers);
    console.log("[timesheetClient] payRaw keys:", payRaw && typeof payRaw === "object" ? Object.keys(payRaw as object).join(",") : String(payRaw));

    // Handle both bare PayCalculation and { success, data: PayCalculation } envelope
    const payData = (payRaw as { data?: { netPay?: number } })?.data ?? (payRaw as { netPay?: number });
    console.log(`[timesheetClient] netPay=${payData?.netPay}`);
    return typeof payData?.netPay === "number" ? payData.netPay : null;
  } catch (err) {
    console.error("[timesheetClient] fetch error:", err);
    return null;
  }
}
