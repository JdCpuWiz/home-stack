import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GroceryListView from "@/components/grocery/GroceryListView";
import { GroceryList, GroceryStore, GroceryArea } from "@/components/grocery/groceryUtils";

export default async function GroceryStorePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { storeId } = await params;
  const id = parseInt(storeId);

  const store = await prisma.groceryStore.findUnique({ where: { id } });
  if (!store) notFound();

  const areas = await prisma.groceryArea.findMany({ orderBy: { position: "asc" } });

  // Fetch or auto-create active list
  let list = await prisma.groceryList.findFirst({
    where: { storeId: id, status: "ACTIVE" },
    include: {
      store: true,
      items: { include: { area: true }, orderBy: { position: "asc" } },
    },
  });

  if (!list) {
    list = await prisma.groceryList.create({
      data: { storeId: id },
      include: {
        store: true,
        items: { include: { area: true }, orderBy: { position: "asc" } },
      },
    });
  }

  // Fetch suggestions from trip history
  const trips = await prisma.groceryTrip.findMany({
    where: { list: { storeId: id } },
    include: { items: { select: { name: true } } },
  });
  const freq = new Map<string, number>();
  for (const trip of trips) {
    for (const item of trip.items) {
      const key = item.name.toLowerCase();
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  const suggestions = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

  return (
    <GroceryListView
      list={list as unknown as GroceryList}
      store={store as unknown as GroceryStore}
      areas={areas as unknown as GroceryArea[]}
      suggestions={suggestions}
    />
  );
}
