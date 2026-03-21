import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PantryClient from "@/components/pantry/PantryClient";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [products, categories] = await Promise.all([
    prisma.pantryProduct.findMany({ orderBy: { name: "asc" } }),
    prisma.pantryCategory.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <PantryClient
      initialProducts={products}
      initialCategories={categories.map((c) => c.name)}
    />
  );
}
