export const FREQUENCY_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  BIANNUAL: 6,
  ANNUAL: 12,
};

export const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  BIANNUAL: "Every 6 mo",
  ANNUAL: "Annual",
};

// Extract YYYY-MM-DD parts safely without timezone issues
function parseDateParts(d: Date | string): { year: number; month: number; day: number } {
  const str = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = str.slice(0, 10).split("-").map(Number);
  return { year: y, month: m, day };
}

/**
 * Returns true if this subscription (given its anchor renewalDate and frequency)
 * is due in the specified year/month.
 */
export function isSubscriptionDueInMonth(
  renewalDate: Date | string,
  frequency: string,
  year: number,
  month: number
): boolean {
  const interval = FREQUENCY_MONTHS[frequency] ?? 1;
  const { year: rYear, month: rMonth } = parseDateParts(renewalDate);
  const monthsDiff = (year - rYear) * 12 + (month - rMonth);
  return ((monthsDiff % interval) + interval) % interval === 0;
}

/**
 * Returns the next upcoming renewal date on or after today,
 * computed by advancing the anchor date by the frequency interval.
 */
export function getNextRenewalDate(renewalDate: Date | string, frequency: string): Date {
  const interval = FREQUENCY_MONTHS[frequency] ?? 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { year: ry, month: rm, day: rd } = parseDateParts(renewalDate);
  let year = ry;
  let month = rm;

  while (true) {
    const candidate = new Date(year, month - 1, rd);
    if (candidate >= today) return candidate;
    month += interval;
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
  }
}

/**
 * Returns the renewal urgency status for display.
 * "red"    — renews this calendar month
 * "yellow" — renews within the next 30 days (but not this month)
 * "green"  — renews more than 30 days from now
 */
export function getRenewalStatus(
  renewalDate: Date | string,
  frequency: string
): "red" | "yellow" | "green" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = getNextRenewalDate(renewalDate, frequency);
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;

  if (next.getFullYear() === thisYear && next.getMonth() + 1 === thisMonth) {
    return "red";
  }

  const daysUntil = (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 30 ? "yellow" : "green";
}
