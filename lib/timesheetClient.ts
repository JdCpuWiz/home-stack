/**
 * Server-side helper for fetching net pay from the Timesheet app.
 * Uses Node's native http/https module to avoid Next.js fetch patching issues.
 * Pay periods run 15th → 14th; the relevant period for a finance month
 * is the one starting on the 15th of the PREVIOUS month (paid on the 25th of
 * the budget month). e.g. March budget → Feb 15–Mar 14 period, paid Mar 25.
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

    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
    req.end();
  });
}

type ApiResponse<T> = { success: boolean; data: T };
type RawPeriod = { id: number; startDate: string };
type RawPay = { netPay: number };

export async function fetchTimesheetNetPay(
  year: number,
  month: number
): Promise<number | null> {
  const timesheetUrl = process.env.TIMESHEET_URL;
  if (!timesheetUrl) return null;

  const apiKey = process.env.TIMESHEET_API_KEY;
  const headers: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {};

  try {
    // The pay period for a budget month starts on the 15th of the *previous* month.
    // e.g. March 2026 budget → pay period Feb 15–Mar 14, paid out Mar 25.
    const prevDate = new Date(year, month - 2, 15); // month-2 because month is 1-based
    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
    const targetStartDate = `${prevYear}-${prevMonth}-15`;

    const periodsRes = await nodeGet(`${timesheetUrl}/api/pay-periods`, headers) as ApiResponse<RawPeriod[]>;
    const periods = periodsRes.data;

    const period = periods.find(
      (p) => p.startDate && p.startDate.substring(0, 10) === targetStartDate
    );
    if (!period) return null;

    const payRes = await nodeGet(`${timesheetUrl}/api/pay-periods/${period.id}/pay`, headers) as ApiResponse<RawPay>;
    const netPay = payRes.data?.netPay;

    return typeof netPay === "number" ? netPay : null;
  } catch (err) {
    console.error("[timesheetClient] error:", err);
    return null;
  }
}
