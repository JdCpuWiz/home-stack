"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GroceryTrip } from "./groceryUtils";

type Props = {
  initialTrips: GroceryTrip[];
};

export default function TripHistoryList({ initialTrips }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleReadd(tripId: number, itemId: number) {
    setAdding((prev) => new Set(prev).add(itemId));
    const res = await fetch(`/api/grocery/trips/${tripId}/items/${itemId}/readd`, {
      method: "POST",
    });
    if (res.ok) {
      const { storeId } = await res.json();
      setAdded((prev) => new Set(prev).add(itemId));
      // Brief confirmation flash then navigate to the store list
      setTimeout(() => router.push(`/grocery/${storeId}`), 600);
    }
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  // Group by date
  const groups = new Map<string, GroceryTrip[]>();
  for (const trip of initialTrips) {
    const date = new Date(trip.completedAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(trip);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Trip History
      </h1>

      {initialTrips.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--text-secondary)" }}>No trips yet.</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Complete a shopping trip to see history here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([date, trips]) => (
            <div key={date}>
              <div
                className="text-xs font-semibold uppercase tracking-widest pb-1 mb-3"
                style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--bg-200)" }}
              >
                {date}
              </div>
              <div className="flex flex-col gap-2">
                {trips.map((trip) => {
                  const total = trip.items.length;
                  const isOpen = expanded.has(trip.id);

                  return (
                    <div key={trip.id} className="card-surface">
                      <button
                        className="w-full flex items-center justify-between gap-3 text-left"
                        onClick={() => toggle(trip.id)}
                      >
                        <div>
                          <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                            {trip.storeName}
                          </span>
                          <span className="text-xs ml-3" style={{ color: "var(--text-secondary)" }}>
                            {new Date(trip.completedAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--bg-300)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--bg-400)",
                            }}
                          >
                            {total} item{total !== 1 ? "s" : ""}
                          </span>
                          <span style={{ color: "var(--text-secondary)" }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {isOpen && trip.items.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1">
                          {trip.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm"
                              style={{ backgroundColor: "var(--bg-200)" }}
                            >
                              <div className="flex-1 min-w-0">
                                <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                                {item.quantity && (
                                  <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>
                                    {item.quantity}
                                  </span>
                                )}
                                {item.areaName && (
                                  <span
                                    className="text-xs ml-2 px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: "var(--bg-300)",
                                      color: "var(--text-secondary)",
                                    }}
                                  >
                                    {item.areaName}
                                  </span>
                                )}
                              </div>
                              <button
                                className="btn-secondary btn-sm shrink-0"
                                disabled={adding.has(item.id) || added.has(item.id)}
                                onClick={() => handleReadd(trip.id, item.id)}
                                style={added.has(item.id) ? { color: "var(--accent-orange)" } : {}}
                              >
                                {added.has(item.id) ? "Added ✓" : adding.has(item.id) ? "…" : "Add"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
