import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FinanceSettingsClient from "@/components/settings/FinanceSettingsClient";

export default async function FinanceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  const items = await prisma.financeBudgetItem.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }, { name: "asc" }],
  });

  return <FinanceSettingsClient initialItems={items as unknown as FinanceBudgetItemType[]} />;
}

// Re-export type for client
export type FinanceBudgetItemType = {
  id: number;
  name: string;
  category: string;
  defaultAmount: string | null;
  payDay: number | null;
  isActive: boolean;
  position: number;
};
