import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GrocerySettingsClient from "@/components/grocery/GrocerySettingsClient";
import { GroceryStore, GroceryArea } from "@/components/grocery/groceryUtils";

export default async function GrocerySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  const stores = await prisma.groceryStore.findMany({ orderBy: { position: "asc" } });
  const areas = await prisma.groceryArea.findMany({ orderBy: { position: "asc" } });

  return (
    <GrocerySettingsClient
      initialStores={stores as unknown as GroceryStore[]}
      initialAreas={areas as unknown as GroceryArea[]}
    />
  );
}
