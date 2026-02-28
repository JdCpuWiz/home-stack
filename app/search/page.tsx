import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const totes = query
    ? await prisma.tote.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            {
              items: {
                some: { description: { contains: query, mode: "insensitive" } },
              },
            },
          ],
        },
        include: { items: { orderBy: { position: "asc" } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Search</h1>

      <form method="get" action="/search" className="flex gap-2 mb-6">
        <input
          className="input flex-1"
          name="q"
          defaultValue={query}
          placeholder="Search totes and items…"
          autoFocus
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {query && (
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {totes.length === 0
            ? `No results for "${query}"`
            : `${totes.length} result${totes.length === 1 ? "" : "s"} for "${query}"`}
        </p>
      )}

      <div className="space-y-3">
        {totes.map((tote) => {
          const matchingItems = tote.items.filter((item) =>
            item.description.toLowerCase().includes(query.toLowerCase())
          );

          return (
            <div key={tote.id} className="card">
              <Link
                href={`/totes/${tote.id}`}
                className="font-semibold hover:underline"
                style={{ color: "var(--accent-orange)" }}
              >
                {tote.title}
              </Link>
              <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                Tote #{tote.id}
              </p>
              {matchingItems.length > 0 && (
                <ul className="text-sm space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                  {matchingItems.map((item) => (
                    <li key={item.id}>• {item.description}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
