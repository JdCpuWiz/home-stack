"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GroceryStore, GroceryArea, GroceryList, GroceryListItem } from "./groceryUtils";
import { useGroceryActions } from "./GroceryActionsContext";
import AddItemDialog from "./AddItemDialog";

type Props = {
  list: GroceryList;
  store: GroceryStore;
  areas: GroceryArea[];
  suggestions: string[];
};

export default function GroceryListView({ list, store, areas, suggestions }: Props) {
  const router = useRouter();
  const { register, unregister } = useGroceryActions();
  // Only show unpurchased items — purchased ones are checked off and hidden
  const [items, setItems] = useState<GroceryListItem[]>(
    list.items.filter((i) => !i.purchased)
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<GroceryListItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    register({ storeName: store.name, completeTrip: handleComplete });
    return () => unregister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.name, completing]);

  // Group by area, sort alphabetically (no-area last)
  const groups = new Map<string, GroceryListItem[]>();
  for (const item of items) {
    const key = item.area?.name ?? "__none__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return a.localeCompare(b);
  });

  function handleSaved(saved: GroceryListItem) {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === saved.id);
      if (exists) return prev.map((i) => (i.id === saved.id ? saved : i));
      return [...prev, saved];
    });
  }

  async function handleDelete(item: GroceryListItem) {
    if (!confirm(`Remove "${item.name}"?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/grocery/lists/${list.id}/items/${item.id}`, { method: "DELETE" });
  }

  async function handleCheck(item: GroceryListItem) {
    // Remove from view immediately; mark purchased in DB so it's included in trip snapshot
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await fetch(`/api/grocery/lists/${list.id}/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased: true }),
    });
  }

  async function handleComplete() {
    if (!confirm("Complete this trip? The list will be saved to history.")) return;
    setCompleting(true);
    const res = await fetch(`/api/grocery/lists/${list.id}/complete`, { method: "POST" });
    if (res.ok) router.push("/grocery");
    setCompleting(false);
  }

  async function handleClear() {
    if (!confirm("Clear all items from this list?")) return;
    setClearing(true);
    await fetch(`/api/grocery/lists/${list.id}/clear`, { method: "DELETE" });
    setItems([]);
    setClearing(false);
  }

  return (
    <>
      <style>{`
        .grocery-row:hover { background-color: var(--bg-400); }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {store.name}
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-12 mb-6">
          <p style={{ color: "var(--text-secondary)" }}>List is empty.</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Add items below, or re-add from History.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mb-6">
          {sortedKeys.map((key) => (
            <div key={key}>
              <div
                className="text-sm font-semibold uppercase tracking-wider pb-1 mb-1"
                style={{ color: "var(--accent-orange)", borderBottom: "1px solid var(--bg-300)" }}
              >
                {key === "__none__" ? "No Area" : key}
              </div>
              {groups.get(key)!.map((item, idx) => (
                <div
                  key={item.id}
                  className="grocery-row flex items-center gap-3 px-3 py-3 cursor-pointer"
                  style={{
                    backgroundColor: idx % 2 === 0 ? "var(--bg-200)" : "var(--bg-300)",
                    borderRadius: "4px",
                  }}
                  onClick={() => handleCheck(item)}
                >
                  {/* Custom circle checkbox — avoids browser-default white dot */}
                  <div
                    className="w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: "var(--bg-400)", backgroundColor: "transparent" }}
                  />
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
                  <div
                    className="flex gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setEditItem(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleDelete(item)}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          + Add Item
        </button>
        {items.length > 0 && (
          <button
            className="btn-danger btn-sm"
            onClick={handleClear}
            disabled={clearing}
          >
            {clearing ? "Clearing…" : "Clear List"}
          </button>
        )}
      </div>

      {(showAdd || editItem) && (
        <AddItemDialog
          listId={list.id}
          areas={areas}
          suggestions={suggestions}
          item={editItem ?? undefined}
          onSave={handleSaved}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
        />
      )}
    </>
  );
}
