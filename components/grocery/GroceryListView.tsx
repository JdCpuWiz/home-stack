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
  const [mode, setMode] = useState<"plan" | "shop">("plan");
  const [items, setItems] = useState<GroceryListItem[]>(list.items);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<GroceryListItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Register Complete Trip action with the SideNav context
  useEffect(() => {
    register({
      storeName: store.name,
      completeTrip: handleComplete,
    });
    return () => unregister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.name, completing]);

  // Group items by area
  const unpurchased = items.filter((i) => !i.purchased);
  const purchased = items.filter((i) => i.purchased);

  function buildGroups(list: GroceryListItem[]) {
    const groups = new Map<string, { areaId: number | null; items: GroceryListItem[] }>();
    for (const item of list) {
      const key = item.area?.name ?? "__none__";
      if (!groups.has(key)) groups.set(key, { areaId: item.areaId, items: [] });
      groups.get(key)!.items.push(item);
    }
    return groups;
  }

  function sortedKeys(groups: Map<string, { areaId: number | null; items: GroceryListItem[] }>) {
    return [...groups.keys()].sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return a.localeCompare(b);
    });
  }

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
    // Optimistically mark as purchased (keep in view, show as checked)
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, purchased: true } : i))
    );
    await fetch(`/api/grocery/lists/${list.id}/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased: true }),
    });
  }

  async function handleUncheck(item: GroceryListItem) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, purchased: false } : i))
    );
    await fetch(`/api/grocery/lists/${list.id}/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased: false }),
    });
  }

  async function handleComplete() {
    if (!confirm("Complete this trip? All items will be archived.")) return;
    setCompleting(true);
    const res = await fetch(`/api/grocery/lists/${list.id}/complete`, { method: "POST" });
    if (res.ok) {
      router.push("/grocery");
    }
    setCompleting(false);
  }

  async function handleClear() {
    if (!confirm("Clear all items from this list?")) return;
    setClearing(true);
    await fetch(`/api/grocery/lists/${list.id}/clear`, { method: "DELETE" });
    setItems([]);
    setMode("plan");
    setClearing(false);
  }

  const unpurchasedGroups = buildGroups(unpurchased);
  const unpurchasedKeys = sortedKeys(unpurchasedGroups);
  const purchasedGroups = buildGroups(purchased);
  const purchasedKeys = sortedKeys(purchasedGroups);

  return (
    <>
      <style>{`
        .shop-item:hover { background-color: var(--bg-300); }
        .plan-item:hover { background-color: var(--bg-200); }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {store.name}
        </h1>
        <div className="flex gap-1">
          <button
            className={mode === "plan" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setMode("plan")}
          >
            Plan
          </button>
          <button
            className={mode === "shop" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setMode("shop")}
          >
            Shop
          </button>
        </div>
      </div>

      {/* Plan Mode */}
      {mode === "plan" && (
        <div>
          {items.length === 0 ? (
            <div className="card text-center py-12">
              <p style={{ color: "var(--text-secondary)" }}>No items yet.</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Add some items below to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 mb-6">
              {sortedKeys(buildGroups(items)).map((key) => {
                const group = buildGroups(items).get(key)!;
                return (
                  <div key={key}>
                    <div
                      className="text-xs font-semibold uppercase tracking-widest pb-1 mb-2"
                      style={{
                        color: "var(--text-secondary)",
                        borderBottom: "1px solid var(--bg-200)",
                      }}
                    >
                      {key === "__none__" ? "No Area" : key}
                    </div>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="plan-item flex items-center gap-3 px-3 py-2 rounded-md"
                          style={{ backgroundColor: "var(--bg-100)" }}
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
                          {item.area && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded shrink-0"
                              style={{
                                backgroundColor: "var(--bg-300)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--bg-400)",
                              }}
                            >
                              {item.area.name}
                            </span>
                          )}
                          <div className="flex gap-1 shrink-0">
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
                  </div>
                );
              })}
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
        </div>
      )}

      {/* Shop Mode */}
      {mode === "shop" && (
        <div>
          {items.length === 0 ? (
            <div className="card text-center py-12">
              <p style={{ color: "var(--text-secondary)" }}>No items in list.</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Add some in Plan Mode.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Unpurchased items */}
              {unpurchasedKeys.map((key) => {
                const group = unpurchasedGroups.get(key)!;
                return (
                  <div key={key}>
                    <div
                      className="text-sm font-semibold uppercase tracking-wider pb-1 mb-1"
                      style={{ color: "var(--accent-orange)", borderBottom: "1px solid var(--bg-300)" }}
                    >
                      {key === "__none__" ? "No Area" : key}
                    </div>
                    {group.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="shop-item flex items-center gap-3 px-3 py-3 cursor-pointer"
                        style={{
                          backgroundColor: idx % 2 === 0 ? "var(--bg-200)" : "var(--bg-300)",
                          borderRadius: "4px",
                        }}
                        onClick={() => handleCheck(item)}
                      >
                        <input
                          type="checkbox"
                          className="w-5 h-5 shrink-0 cursor-pointer"
                          style={{ accentColor: "var(--accent-orange)" }}
                          checked={false}
                          readOnly
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
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Purchased items */}
              {purchased.length > 0 && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-widest pb-1 mb-1"
                    style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-200)" }}
                  >
                    In Cart
                  </div>
                  {purchasedKeys.map((key) => {
                    const group = purchasedGroups.get(key)!;
                    return (
                      <div key={key} className="mb-2">
                        {purchasedKeys.length > 1 && key !== "__none__" && (
                          <div className="text-xs pl-2 mb-0.5" style={{ color: "var(--text-secondary)" }}>
                            {key}
                          </div>
                        )}
                        {group.items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="shop-item flex items-center gap-3 px-3 py-2 cursor-pointer"
                            style={{
                              backgroundColor: idx % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                              borderRadius: "4px",
                              opacity: 0.6,
                            }}
                            onClick={() => handleUncheck(item)}
                          >
                            <input
                              type="checkbox"
                              className="w-5 h-5 shrink-0 cursor-pointer"
                              style={{ accentColor: "var(--accent-orange)" }}
                              checked={true}
                              readOnly
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className="text-sm"
                                style={{
                                  color: "var(--text-secondary)",
                                  textDecoration: "line-through",
                                }}
                              >
                                {item.name}
                              </span>
                              {item.quantity && (
                                <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>
                                  {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit dialog */}
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
