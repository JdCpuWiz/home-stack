"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HistoryItem } from "@/app/grocery/history/page";

type Store = { id: number; name: string };

type Props = {
  initialItems: HistoryItem[];
  stores: Store[];
};

export default function GroceryItemHistory({ initialItems, stores }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>(initialItems);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    stores[0]?.id.toString() ?? ""
  );
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [addedMsg, setAddedMsg] = useState<Map<string, string>>(new Map()); // name → message
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  // Group by category, no-category last
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const key = item.areaName ?? "__none__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return a.localeCompare(b);
  });
  // Sort items within each group alphabetically
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function handleAdd(item: HistoryItem) {
    if (!selectedStoreId) return;
    setAdding((prev) => new Set(prev).add(item.name));

    const res = await fetch(`/api/grocery/stores/${selectedStoreId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: item.name, quantity: item.quantity, category: item.areaName }),
    });

    const msg = res.status === 409 ? "Already on list" : res.ok ? "Added ✓" : "Error";
    setAddedMsg((prev) => new Map(prev).set(item.name, msg));

    if (res.ok) {
      setTimeout(() => router.push(`/grocery/${selectedStoreId}`), 600);
    } else {
      setTimeout(() => {
        setAddedMsg((prev) => {
          const next = new Map(prev);
          next.delete(item.name);
          return next;
        });
      }, 2000);
    }

    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(item.name);
      return next;
    });
  }

  async function handleDelete(item: HistoryItem) {
    if (!confirm(`Remove "${item.name}" from history?`)) return;
    setDeleting((prev) => new Set(prev).add(item.name));

    await fetch(
      `/api/grocery/history/items?name=${encodeURIComponent(item.name)}`,
      { method: "DELETE" }
    );

    setItems((prev) => prev.filter((i) => i.name.toLowerCase() !== item.name.toLowerCase()));
    setDeleting((prev) => {
      const next = new Set(prev);
      next.delete(item.name);
      return next;
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Item History
      </h1>

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--text-secondary)" }}>No item history yet.</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Complete a shopping trip to populate history.
          </p>
        </div>
      ) : (
        <>
          {/* Store picker */}
          <div
            className="card-surface flex items-center gap-3 mb-6"
            style={{ flexWrap: "wrap" }}
          >
            <span className="text-sm font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>
              Add items to:
            </span>
            <select
              className="input"
              style={{ maxWidth: "220px" }}
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Items grouped by area */}
          <div className="flex flex-col gap-6">
            {sortedKeys.map((key) => (
              <div key={key}>
                <div
                  className="text-sm font-semibold uppercase tracking-wider pb-1 mb-1"
                  style={{ color: "var(--accent-orange)", borderBottom: "1px solid var(--bg-300)" }}
                >
                  {key === "__none__" ? "No Category" : key}
                </div>
                <div className="flex flex-col gap-1">
                  {groups.get(key)!.map((item) => {
                    const msg = addedMsg.get(item.name);
                    const isAdding = adding.has(item.name);
                    const isDeleting = deleting.has(item.name);
                    const isAlready = msg === "Already on list";

                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 px-3 py-2 rounded-md"
                        style={{ backgroundColor: "var(--bg-200)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>
                              {item.quantity}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            className="btn-secondary btn-sm"
                            disabled={isAdding || !!msg || !selectedStoreId}
                            onClick={() => handleAdd(item)}
                            style={
                              msg
                                ? { color: isAlready ? "#ef4444" : "var(--accent-orange)" }
                                : undefined
                            }
                          >
                            {msg ?? (isAdding ? "…" : "Add")}
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            disabled={isDeleting}
                            onClick={() => handleDelete(item)}
                          >
                            {isDeleting ? "…" : "Del"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
