import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { Carrier, PackageStatus } from "@prisma/client";

const VALID_CARRIERS = new Set<string>(["USPS", "UPS", "FEDEX"]);
const VALID_STATUSES = new Set<string>([
  "UNKNOWN", "PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION",
]);

export function trackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    default:
      return "";
  }
}

// GET /api/packages — list packages
// ?all=true  → include delivered
// ?eta=today → only packages with estimatedDelivery = today (local date)
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const all = searchParams.get("all") === "true";
  const etaToday = searchParams.get("eta") === "today";

  const where: Record<string, unknown> = {};

  if (!all) where.delivered = false;

  if (etaToday) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    where.estimatedDelivery = { gte: start, lt: end };
  }

  const packages = await prisma.package.findMany({
    where,
    orderBy: [{ estimatedDelivery: "asc" }, { createdAt: "desc" }],
  });

  const result = packages.map((pkg) => ({
    ...pkg,
    trackingUrl: trackingUrl(pkg.carrier, pkg.trackingNumber),
  }));

  return NextResponse.json(result);
}

// POST /api/packages — create (idempotent by trackingNumber)
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { trackingNumber, carrier, description, sourceEmail } = body as {
    trackingNumber?: string;
    carrier?: string;
    description?: string;
    sourceEmail?: string;
  };

  if (!trackingNumber?.trim()) {
    return NextResponse.json({ error: "trackingNumber is required" }, { status: 400 });
  }
  if (!carrier || !VALID_CARRIERS.has(carrier)) {
    return NextResponse.json({ error: "carrier must be USPS, UPS, or FEDEX" }, { status: 400 });
  }

  const tracking = trackingNumber.trim().toUpperCase().replace(/\s+/g, "");

  // Idempotent — if already exists, return existing record
  const existing = await prisma.package.findUnique({ where: { trackingNumber: tracking } });
  if (existing) {
    return NextResponse.json(
      { ...existing, trackingUrl: trackingUrl(existing.carrier, existing.trackingNumber) },
      { status: 200 }
    );
  }

  const pkg = await prisma.package.create({
    data: {
      trackingNumber: tracking,
      carrier: carrier as Carrier,
      description: description?.trim().slice(0, 200) || null,
      sourceEmail: sourceEmail?.trim() || null,
    },
  });

  return NextResponse.json(
    { ...pkg, trackingUrl: trackingUrl(pkg.carrier, pkg.trackingNumber) },
    { status: 201 }
  );
}
