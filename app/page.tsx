import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, CheckSquare, ShoppingCart, UtensilsCrossed, Truck, DollarSign, ScanLine, AlertTriangle, RefreshCw } from "lucide-react";
import { isSubscriptionDueInMonth } from "@/lib/subscriptionUtils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [toteCount, todoCount, overdueCount, activeGroceryLists, pantryStats, recipeCount, activePackageCount, outForDeliveryCount, financeMonth, allActiveSubs] = await Promise.all([
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
    prisma.pantryProduct.findMany({ select: { quantity: true, minQty: true } })
      .then((items) => ({
        total: items.length,
        lowCount: items.filter((p) => p.quantity === 0 || (p.minQty > 0 && p.quantity <= p.minQty)).length,
      }))
      .catch(() => ({ total: 0, lowCount: 0 })),
    prisma.recipe.count(),
    prisma.package.count({ where: { delivered: false } }),
    prisma.package.count({ where: { status: "OUT_FOR_DELIVERY" } }),
    prisma.financeMonth.findUnique({
      where: { year_month: { year: currentYear, month: currentMonth } },
      include: { entries: { select: { amount: true, isPaid: true } } },
    }),
    prisma.subscription.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const financeNetPay = financeMonth?.netPay ? parseFloat(financeMonth.netPay.toString()) : null;
  const financeCommitted = financeMonth
    ? financeMonth.entries.reduce((s, e) => s + parseFloat(e.amount.toString()), 0)
    : null;
  const financeBalance = financeNetPay != null && financeCommitted != null ? financeNetPay - financeCommitted : null;
  const financePaid = financeMonth ? financeMonth.entries.filter((e) => e.isPaid).length : 0;
  const financeTotal = financeMonth ? financeMonth.entries.length : 0;

  const subsThisMonth = allActiveSubs.filter((s) =>
    isSubscriptionDueInMonth(s.renewalDate, s.frequency, currentYear, currentMonth)
  );
  const subsThisMonthTotal = subsThisMonth.reduce(
    (sum, s) => sum + parseFloat(s.cost.toString()),
    0
  );

  function fmtCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

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

        {/* Pantry */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <ScanLine size={20} />
            <span className="font-semibold">Pantry</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold" style={{ color: "var(--accent-orange)" }}>
              {pantryStats.total}
            </span>
            {pantryStats.lowCount > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ backgroundColor: "#eab308", color: "#000" }}
              >
                <AlertTriangle size={10} />
                {pantryStats.lowCount} low
              </span>
            )}
          </div>
          <Link href="/pantry" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            View Inventory →
          </Link>
        </div>

        {/* Packages */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <Truck size={20} />
            <span className="font-semibold">Packages</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold" style={{ color: "var(--accent-orange)" }}>
              {activePackageCount}
            </span>
            {outForDeliveryCount > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#14532d", color: "#86efac" }}
              >
                {outForDeliveryCount} out for delivery
              </span>
            )}
          </div>
          <Link href="/packages" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All Packages →
          </Link>
        </div>
        {/* Finance */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <DollarSign size={20} />
            <span className="font-semibold">Finance</span>
          </div>
          {financeMonth ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Net Pay</span>
                <span style={{ color: financeNetPay != null ? "#4ade80" : "var(--text-secondary)" }}>
                  {financeNetPay != null ? fmtCurrency(financeNetPay) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Committed</span>
                <span style={{ color: "var(--accent-orange)" }}>
                  {financeCommitted != null ? fmtCurrency(financeCommitted) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Balance</span>
                <span style={{
                  color: financeBalance != null
                    ? financeBalance >= 0 ? "#4ade80" : "#f87171"
                    : "var(--text-secondary)",
                  fontWeight: 600,
                }}>
                  {financeBalance != null ? fmtCurrency(financeBalance) : "—"}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {financePaid}/{financeTotal} paid
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No data for this month
            </p>
          )}
          <Link href="/finance" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            View Budget →
          </Link>
        </div>

        {/* Subscriptions */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2" style={{ color: "var(--accent-orange)" }}>
            <RefreshCw size={20} />
            <span className="font-semibold">Subscriptions</span>
          </div>
          {allActiveSubs.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No subscriptions set up
            </p>
          ) : subsThisMonth.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              None due this month
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {subsThisMonth.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2" style={{ color: "var(--text-primary)" }}>
                    {s.name}
                  </span>
                  <span className="shrink-0 tabular-nums" style={{ color: "var(--accent-orange)" }}>
                    {fmtCurrency(parseFloat(s.cost.toString()))}
                  </span>
                </div>
              ))}
              {subsThisMonth.length > 1 && (
                <div
                  className="flex items-center justify-between text-sm font-semibold pt-1 mt-0.5"
                  style={{ borderTop: "1px solid var(--bg-300)" }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>Total</span>
                  <span style={{ color: "var(--accent-orange)" }}>
                    {fmtCurrency(subsThisMonthTotal)}
                  </span>
                </div>
              )}
            </div>
          )}
          <Link href="/subscriptions" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All Subscriptions →
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
