import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GrocerySettingsClient from "@/components/grocery/GrocerySettingsClient";
import { GroceryStore } from "@/components/grocery/groceryUtils";

export default async function GrocerySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  const stores = await prisma.groceryStore.findMany({ orderBy: { position: "asc" } });

  return (
    <GrocerySettingsClient
      initialStores={stores as unknown as GroceryStore[]}
    />
  );
}
