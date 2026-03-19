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

    const periodsRes = await nodeGet(
      `${timesheetUrl}/api/pay-periods`,
      headers
    ) as { success: boolean; data: Array<{ id: number; start_date: string }> };

    const periods = Array.isArray(periodsRes) ? periodsRes : periodsRes.data;
    console.log(`[timesheetClient] got ${periods?.length} periods, first start_dates:`, periods?.slice(0, 3).map(p => p.start_date));

    const period = periods?.find(
      (p) => p.start_date && p.start_date.substring(0, 10) === targetStartDate
    );
    if (!period) {
      console.warn(`[timesheetClient] no period found with start_date=${targetStartDate}`);
      return null;
    }

    const payRes = await nodeGet(
      `${timesheetUrl}/api/pay-periods/${period.id}/pay`,
      headers
    ) as { success: boolean; data: { netPay?: number } } | { netPay?: number };

    const payData = "data" in payRes ? payRes.data : payRes;
    console.log(`[timesheetClient] netPay=${payData.netPay}`);
    return typeof payData.netPay === "number" ? payData.netPay : null;
  } catch (err) {
    console.error("[timesheetClient] fetch error:", err);
    return null;
  }
}
