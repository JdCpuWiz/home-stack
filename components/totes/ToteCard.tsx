import Link from "next/link";
import type { Tote, ToteItem } from "@prisma/client";

type ToteWithItems = Tote & { items: ToteItem[] };

export default function ToteCard({ tote }: { tote: ToteWithItems }) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/totes/${tote.id}`}
          className="font-semibold text-base hover:underline"
          style={{ color: "var(--accent-orange)" }}
        >
          {tote.title}
        </Link>
        <span
          className="text-xs whitespace-nowrap"
          style={{ color: "var(--text-secondary)" }}
        >
          #{tote.id}
        </span>
      </div>

      {tote.items.length > 0 ? (
        <ul className="text-sm space-y-0.5" style={{ color: "var(--text-secondary)" }}>
          {tote.items.slice(0, 5).map((item) => (
            <li key={item.id} className="truncate">
              • {item.description}
            </li>
          ))}
          {tote.items.length > 5 && (
            <li style={{ color: "var(--text-secondary)" }}>
              +{tote.items.length - 5} more…
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
          No items
        </p>
      )}

      <div className="flex gap-2 mt-1">
        <Link href={`/totes/${tote.id}/edit`} className="btn-secondary btn-sm">
          Edit
        </Link>
        <Link href={`/totes/${tote.id}/label`} className="btn-secondary btn-sm">
          Label
        </Link>
      </div>
    </div>
  );
}
