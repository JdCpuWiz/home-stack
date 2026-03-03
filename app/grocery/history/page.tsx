import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GroceryItemHistory from "@/components/grocery/GroceryItemHistory";

export type HistoryItem = {
  name: string;
  quantity: string | null;
  areaName: string | null;
};

export default async function GroceryHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [allTripItems, stores] = await Promise.all([
    prisma.groceryTripItem.findMany({ orderBy: { id: "desc" } }),
    prisma.groceryStore.findMany({ orderBy: { position: "asc" } }),
  ]);

  // Deduplicate by name (case-insensitive), keep most recent occurrence
  const seen = new Set<string>();
  const items: HistoryItem[] = [];
  for (const item of allTripItems) {
    const key = item.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ name: item.name, quantity: item.quantity, areaName: item.areaName });
    }
  }

  return (
    <GroceryItemHistory
      initialItems={items}
      stores={stores.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
