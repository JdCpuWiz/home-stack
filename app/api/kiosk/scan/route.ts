import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Intentionally unauthenticated — kiosk runs on local LAN with no browser session.
// Protected at the network level (Traefik / local-only access).

const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL ?? "";

function fireHaEvent(payload: Record<string, unknown>) {
  if (!HA_WEBHOOK_URL) return;
  fetch(HA_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

interface ApiProductData {
  name: string;
  brand?: string;
  size?: string;
  photoUrl?: string;
  category?: string;
}

async function lookupOpenFoodFacts(barcode: string): Promise<ApiProductData | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { "User-Agent": "HomeStack/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const name = (p.product_name || p.product_name_en || "").trim();
    if (!name) return null;
    return {
      name,
      brand: p.brands ? p.brands.split(",")[0].trim() : undefined,
      size: p.quantity || undefined,
      photoUrl: p.image_url || p.image_front_url || undefined,
      category: p.categories ? p.categories.split(",")[0].trim() : undefined,
    };
  } catch {
    return null;
  }
}

async function lookupUPCitemdb(barcode: string): Promise<ApiProductData | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
      headers: { "User-Agent": "HomeStack/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "OK" || !data.items?.length) return null;
    const item = data.items[0];
    const name = (item.title || "").trim();
    if (!name) return null;
    return {
      name,
      brand: item.brand || undefined,
      size: item.size || undefined,
      photoUrl: item.images?.[0] || undefined,
      category: item.category || undefined,
    };
  } catch {
    return null;
  }
}

// POST /api/kiosk/scan
// Body: { barcode: string, delta: number }  (+1 = stock in, -1 = stock out)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { barcode, delta } = body;

  if (!barcode || typeof delta !== "number") {
    return NextResponse.json({ error: "barcode and delta are required" }, { status: 400 });
  }

  // 1. Check existing product in DB
  let product = await prisma.pantryProduct.findUnique({ where: { barcode } });

  if (product) {
    const newQty = Math.max(0, product.quantity + delta);
    const updated = await prisma.pantryProduct.update({
      where: { id: product.id },
      data: { quantity: newQty },
    });

    // Fire HA notification if item just hit zero
    if (delta < 0 && newQty === 0) {
      fireHaEvent({ event: "out_of_stock", product: updated.name, quantity: 0 });
    }

    // If scanning out and qty just crossed the min threshold, add to the first active grocery list
    let addedToGroceryLists: string[] = [];
    if (delta < 0 && product.minQty > 0 && newQty <= product.minQty) {
      const activeList = await prisma.groceryList.findFirst({
        where: { status: "ACTIVE" },
        include: { store: true, items: { select: { name: true } } },
        orderBy: { store: { position: "asc" } },
      });
      if (activeList) {
        const alreadyOn = activeList.items.some(
          (i) => i.name.toLowerCase() === updated.name.toLowerCase()
        );
        if (!alreadyOn) {
          await prisma.groceryListItem.create({
            data: {
              listId: activeList.id,
              name: updated.name,
              category: updated.category ?? null,
              quantity: null,
              purchased: false,
              position: activeList.items.length,
            },
          });
          addedToGroceryLists.push(activeList.store.name);
          fireHaEvent({
            event: "added_to_grocery",
            product: updated.name,
            quantity: newQty,
            store: activeList.store.name,
          });
        }
      }
    }

    return NextResponse.json({ status: "updated", product: updated, autocreated: false, addedToGroceryLists });
  }

  // 2. Not in DB — try external lookup waterfall
  const apiData = (await lookupOpenFoodFacts(barcode)) ?? (await lookupUPCitemdb(barcode));

  if (apiData) {
    // Auto-create from external data
    const created = await prisma.pantryProduct.create({
      data: {
        barcode,
        name: apiData.name,
        brand: apiData.brand ?? null,
        size: apiData.size ?? null,
        photoUrl: apiData.photoUrl ?? null,
        category: apiData.category ?? null,
        quantity: Math.max(0, delta),
        minQty: 1,
      },
    });
    return NextResponse.json({ status: "autocreated", product: created, autocreated: true });
  }

  // 3. Not found anywhere
  return NextResponse.json({ status: "not_found", barcode }, { status: 404 });
}
