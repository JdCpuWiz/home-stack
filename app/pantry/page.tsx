import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PantryClient from "@/components/pantry/PantryClient";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const products = await prisma.pantryProduct.findMany({
    orderBy: { name: "asc" },
  });

  return <PantryClient initialProducts={products} />;
}
