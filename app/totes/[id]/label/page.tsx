import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LabelView from "@/components/totes/LabelView";

type Props = { params: Promise<{ id: string }> };

export default async function LabelPage({ params }: Props) {
  const { id } = await params;
  const toteId = parseInt(id);
  if (isNaN(toteId)) notFound();

  const tote = await prisma.tote.findUnique({
    where: { id: toteId },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!tote) notFound();

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const toteUrl = `${baseUrl}/totes/${tote.id}`;

  return (
    <LabelView
      toteId={tote.id}
      title={tote.title}
      items={tote.items}
      url={toteUrl}
    />
  );
}
