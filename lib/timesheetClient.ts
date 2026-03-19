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
    const paddedMonth = String(month).padStart(2, "0");
    const targetStartDate = `${year}-${paddedMonth}-15`;

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
