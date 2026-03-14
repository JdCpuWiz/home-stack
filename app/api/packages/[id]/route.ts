import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { Carrier, PackageStatus } from "@prisma/client";
import { trackingUrl } from "../route";

const VALID_CARRIERS = new Set<string>(["USPS", "UPS", "FEDEX"]);
const VALID_STATUSES = new Set<string>([
  "UNKNOWN", "PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION",
]);

type Params = { params: Promise<{ id: string }> };

// PATCH /api/packages/[id] — update status, ETA, events, delivered flag
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const pkgId = parseInt(id);
  if (isNaN(pkgId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const { carrier, description, status, statusDetail, estimatedDelivery, delivered, events, shipperName, originCity, originState } =
    body as {
      carrier?: string;
      description?: string;
      status?: string;
      statusDetail?: string;
      estimatedDelivery?: string | null;
      delivered?: boolean;
      events?: unknown;
      shipperName?: string | null;
      originCity?: string | null;
      originState?: string | null;
    };

  const existing = await prisma.package.findUnique({ where: { id: pkgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alreadyDelivered = existing.delivered;
  const data: Record<string, unknown> = {};

  if (carrier !== undefined) {
    if (!VALID_CARRIERS.has(carrier)) {
      return NextResponse.json({ error: "Invalid carrier" }, { status: 400 });
    }
    data.carrier = carrier as Carrier;
  }
  if (description !== undefined) data.description = description?.trim().slice(0, 200) || null;
  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    // Never downgrade status away from DELIVERED once set
    if (!alreadyDelivered) {
      data.status = status as PackageStatus;
      if (status === "DELIVERED") data.delivered = true;
    }
  }
  if (statusDetail !== undefined) data.statusDetail = statusDetail?.trim().slice(0, 500) || null;
  if (estimatedDelivery !== undefined) {
    data.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
  }
  // Never reset delivered back to false once true
  if (delivered !== undefined && !alreadyDelivered) data.delivered = Boolean(delivered);
  if (events !== undefined) data.events = events;
  if (shipperName !== undefined) {
    const newShipper = shipperName?.trim().slice(0, 200) || null;
    // Don't overwrite a user-saved value with null/empty (n8n may send null when it can't detect the sender)
    if (newShipper || !existing.shipperName) data.shipperName = newShipper;
  }
  if (originCity !== undefined) data.originCity = originCity?.trim().slice(0, 100) || null;
  if (originState !== undefined) data.originState = originState?.trim().slice(0, 50) || null;

  const pkg = await prisma.package.update({
    where: { id: pkgId },
    data,
  });

  return NextResponse.json({
    ...pkg,
    trackingUrl: trackingUrl(pkg.carrier, pkg.trackingNumber),
  });
}

// DELETE /api/packages/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const pkgId = parseInt(id);
  if (isNaN(pkgId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.package.delete({ where: { id: pkgId } });
  return NextResponse.json({ ok: true });
}
