import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function ToteDetailPage({ params }: Props) {
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
    <div className="max-w-lg mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Tote #{tote.id}
          </p>
          <h1 className="text-2xl font-bold">{tote.title}</h1>
        </div>
        <div className="flex gap-2 mt-1">
          <Link href={`/totes/${tote.id}/edit`} className="btn-secondary btn-sm">
            Edit
          </Link>
          <Link href={`/totes/${tote.id}/label`} className="btn-primary btn-sm">
            Print Label
          </Link>
        </div>
      </div>

      <div className="card">
        {tote.items.length === 0 ? (
          <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
            No items in this tote.
          </p>
        ) : (
          <ul className="space-y-2">
            {tote.items.map((item) => (
              <li
                key={item.id}
                className="text-sm flex items-start gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <span style={{ color: "var(--accent-orange)" }}>•</span>
                {item.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {tote.photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tote.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={`/uploads/totes/${tote.id}/${photo.filename}`}
              alt=""
              className="w-full aspect-square object-cover rounded"
              style={{ border: "1px solid var(--bg-200)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
