import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ToteForm from "@/components/totes/ToteForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditTotePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const toteId = parseInt(id);
  if (isNaN(toteId)) notFound();

  const tote = await prisma.tote.findUnique({
    where: { id: toteId },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!tote) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Tote</h1>
      <ToteForm
        toteId={tote.id}
        initialTitle={tote.title}
        initialItems={tote.items.map((i) => i.description)}
      />
    </div>
  );
}
