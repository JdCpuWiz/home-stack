import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ToteForm from "@/components/totes/ToteForm";
import TotePhotoManager from "@/components/totes/TotePhotoManager";

type Props = { params: Promise<{ id: string }> };

export default async function EditTotePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const toteId = parseInt(id);
  if (isNaN(toteId)) notFound();

  const tote = await prisma.tote.findUnique({
    where: { id: toteId },
    include: {
      items: { orderBy: { position: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!tote) notFound();

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Edit Tote</h1>
      <ToteForm
        toteId={tote.id}
        initialTitle={tote.title}
        initialItems={tote.items.map((i) => i.description)}
      />
      <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--bg-200)" }}>
        <TotePhotoManager
          toteId={tote.id}
          initialPhotos={tote.photos.map((p) => ({ id: p.id, filename: p.filename }))}
        />
      </div>
    </div>
  );
}
