import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GroceryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const stores = await prisma.groceryStore.findMany({ orderBy: { position: "asc" } });

  // For each store, count active list items
  const storeSummaries = await Promise.all(
    stores.map(async (store) => {
      const activeList = await prisma.groceryList.findFirst({
        where: { storeId: store.id, status: "ACTIVE" },
        include: { _count: { select: { items: true } } },
      });
      return { store, itemCount: activeList?._count.items ?? null };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Grocery
        </h1>
      </div>

      {stores.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--text-secondary)" }}>No stores configured yet.</p>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            <Link href="/settings/grocery" style={{ color: "var(--accent-orange)" }}>
              Add stores in Grocery Settings
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {storeSummaries.map(({ store, itemCount }) => (
            <Link key={store.id} href={`/grocery/${store.id}`}>
              <div
                className="card-surface flex items-center justify-between transition-colors cursor-pointer"
                style={{ cursor: "pointer" }}
              >
                <div>
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {store.name}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--bg-300)",
                    color: itemCount !== null && itemCount > 0 ? "var(--accent-orange)" : "var(--text-secondary)",
                    border: "1px solid var(--bg-400)",
                  }}
                >
                  {itemCount === null ? "No list" : itemCount === 0 ? "Empty list" : `${itemCount} item${itemCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
