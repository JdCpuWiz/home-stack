import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PantryCategorySettingsClient from "@/components/settings/PantryCategorySettingsClient";

export const dynamic = "force-dynamic";

export default async function PantrySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") redirect("/");

  const categories = await prisma.pantryCategory.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, icon: true, position: true },
  });

  return <PantryCategorySettingsClient initialCategories={categories} />;
}
