import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ToteCard from "@/components/totes/ToteCard";

export const dynamic = "force-dynamic";

export default async function TotesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const totes = await prisma.tote.findMany({
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Totes</h1>
        <Link href="/totes/new" className="btn-primary">
          + New Tote
        </Link>
      </div>

      {totes.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--text-secondary)" }}>No totes yet.</p>
          <Link href="/totes/new" className="btn-primary mt-4 inline-block">
            Create your first tote
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {totes.map((tote) => (
            <ToteCard key={tote.id} tote={tote} />
          ))}
        </div>
      )}
    </div>
  );
}
