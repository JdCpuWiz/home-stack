import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { barcode } = await params;

  const existing = await prisma.pantryProduct.findUnique({ where: { barcode } });
  if (existing) {
    return NextResponse.json({ exists: true, product: existing });
  }

  const apiData = (await lookupOpenFoodFacts(barcode)) ?? (await lookupUPCitemdb(barcode));
  return NextResponse.json({ exists: false, apiData });
}
