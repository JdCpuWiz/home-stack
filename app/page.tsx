import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, CheckSquare, ShoppingCart, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const now = new Date();
  const [toteCount, todoCount, overdueCount, activeGroceryLists, recipeCount] = await Promise.all([
    prisma.tote.count(),
    prisma.todoItem.count(),
    prisma.todoItem.count({ where: { dueDate: { lt: now } } }),
    prisma.groceryList.findMany({
      where: { status: "ACTIVE" },
      include: {
        store: true,
        _count: { select: { items: { where: { purchased: false } } } },
      },
      orderBy: { store: { position: "asc" } },
    }),
    prisma.recipe.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Totes */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <Package size={20} />
            <span className="font-semibold">Totes</span>
          </div>
          <div className="text-4xl font-bold" style={{ color: "var(--accent-orange)" }}>
            {toteCount}
          </div>
          <Link href="/totes" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All Totes →
          </Link>
        </div>

        {/* Todos */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <CheckSquare size={20} />
            <span className="font-semibold">Todos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold" style={{ color: "var(--accent-orange)" }}>
              {todoCount}
            </span>
            {overdueCount > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5" }}
              >
                {overdueCount} overdue
              </span>
            )}
          </div>
          <Link href="/todos" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            View List →
          </Link>
        </div>

        {/* Grocery */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <ShoppingCart size={20} />
            <span className="font-semibold">Grocery</span>
          </div>
          {activeGroceryLists.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No active lists
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {activeGroceryLists.map((list) => (
                <div key={list.id} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/grocery/${list.store.id}`}
                    style={{ color: "var(--text-primary)" }}
                  >
                    {list.store.name}
                  </Link>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {list._count.items} {list._count.items === 1 ? "item" : "items"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/grocery" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All Lists →
          </Link>
        </div>

        {/* Recipes */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <UtensilsCrossed size={20} />
            <span className="font-semibold">Recipes</span>
          </div>
          <div className="text-4xl font-bold" style={{ color: "var(--accent-orange)" }}>
            {recipeCount}
          </div>
          <Link href="/recipes" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All Recipes →
          </Link>
        </div>
      </div>
    </div>
  );
}
