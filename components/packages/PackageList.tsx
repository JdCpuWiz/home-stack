"use client";

import { useState } from "react";
import { ExternalLink, Truck, CheckCircle, Trash2, Plus, X } from "lucide-react";

export type PackageItem = {
  id: number;
  trackingNumber: string;
  carrier: "USPS" | "UPS";
  description: string | null;
  status: string;
  statusDetail: string | null;
  estimatedDelivery: string | null;
  delivered: boolean;
  sourceEmail: string | null;
  trackingUrl: string;
  createdAt: string;
  updatedAt: string;
};

const CARRIER_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  USPS: { label: "USPS", bg: "#1a1a3e", color: "#6b9fff", border: "#2a2a5e" },
  UPS: { label: "UPS", bg: "#3e2800", color: "#ffb500", border: "#5e3c00" },
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  UNKNOWN:          { label: "Unknown",           color: "var(--text-secondary)" },
  PENDING:          { label: "Pending",            color: "var(--text-secondary)" },
  IN_TRANSIT:       { label: "In Transit",         color: "#6b9fff" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",   color: "var(--accent-orange)" },
  DELIVERED:        { label: "Delivered",          color: "#4ade80" },
  EXCEPTION:        { label: "Exception",          color: "#f87171" },
};

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatEta(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (isToday(dateStr)) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type AddFormState = {
  trackingNumber: string;
  carrier: "USPS" | "UPS";
  description: string;
};

const STATUS_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "out_for_delivery", label: "Out for Delivery", statuses: ["OUT_FOR_DELIVERY"] },
  { key: "on_the_way",       label: "On the Way",       statuses: ["IN_TRANSIT"] },
  { key: "pending",          label: "Pending",           statuses: ["PENDING", "UNKNOWN"] },
  { key: "exception",        label: "Exception",         statuses: ["EXCEPTION"] },
];

export default function PackageList({ initialPackages }: { initialPackages: PackageItem[] }) {
  const [packages, setPackages] = useState<PackageItem[]>(initialPackages);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddFormState>({ trackingNumber: "", carrier: "UPS", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const active = packages.filter((p) => !p.delivered);
  const delivered = packages.filter((p) => p.delivered);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.trackingNumber.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const pkg = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setPackages((prev) => {
        const exists = prev.find((p) => p.id === pkg.id);
        if (exists) return prev;
        return [pkg, ...prev];
      });
      setForm({ trackingNumber: "", carrier: "UPS", description: "" });
      setShowAdd(false);
    }
  }

  async function handleMarkDelivered(pkg: PackageItem) {
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, delivered: true, status: "DELIVERED" } : p))
    );
    await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivered: true, status: "DELIVERED" }),
    });
  }

  async function handleDelete(pkg: PackageItem) {
    if (!confirm(`Remove tracking for ${pkg.trackingNumber}?`)) return;
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    await fetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Packages
        </h1>
        <button className="btn-primary btn-sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? <X size={14} /> : <><Plus size={14} /> Add</>}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="card mb-6 flex flex-col gap-3"
          style={{ padding: "1rem" }}
        >
          <div className="flex gap-2 flex-wrap">
            <select
              value={form.carrier}
              onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value as AddFormState["carrier"] }))}
              className="input"
              style={{ width: "auto" }}
            >
              <option value="UPS">UPS</option>
              <option value="USPS">USPS</option>
            </select>
            <input
              className="input flex-1"
              placeholder="Tracking number"
              value={form.trackingNumber}
              onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
              required
            />
          </div>
          <input
            className="input"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={submitting}>
              {submitting ? "Adding…" : "Add Package"}
            </button>
          </div>
        </form>
      )}

      {/* Active packages grouped by status */}
      {active.length === 0 ? (
        <div className="card text-center py-12">
          <Truck size={32} style={{ color: "var(--text-secondary)", margin: "0 auto 0.75rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>No pending packages.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mb-6">
          {STATUS_GROUPS.map(({ key, label, statuses }) => {
            const group = active.filter((p) => statuses.includes(p.status));
            if (group.length === 0) return null;
            const collapsed = collapsedGroups[key] ?? false;
            return (
              <div key={key}>
                <button
                  className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1"
                  style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => toggleGroup(key)}
                >
                  {collapsed ? "▸" : "▾"} {label} ({group.length})
                </button>
                {!collapsed && (
                  <div className="flex flex-col gap-3">
                    {group.map((pkg) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        onMarkDelivered={handleMarkDelivered}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delivered toggle */}
      {delivered.length > 0 && (
        <div>
          <button
            className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1"
            style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setShowDelivered((v) => !v)}
          >
            {showDelivered ? "▾" : "▸"} Delivered ({delivered.length})
          </button>
          {showDelivered && (
            <div className="flex flex-col gap-3">
              {delivered.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onMarkDelivered={handleMarkDelivered}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PackageCard({
  pkg,
  onMarkDelivered,
  onDelete,
}: {
  pkg: PackageItem;
  onMarkDelivered: (p: PackageItem) => void;
  onDelete: (p: PackageItem) => void;
}) {
  const carrier = CARRIER_STYLE[pkg.carrier] ?? CARRIER_STYLE.UPS;
  const status = STATUS_STYLE[pkg.status] ?? STATUS_STYLE.UNKNOWN;
  const etaLabel = formatEta(pkg.estimatedDelivery);
  const etaToday = isToday(pkg.estimatedDelivery);

  return (
    <div className="card-surface flex gap-3 items-start">
      {/* Carrier badge */}
      <div
        className="shrink-0 text-xs font-bold px-2 py-0.5 rounded mt-0.5"
        style={{ backgroundColor: carrier.bg, color: carrier.color, border: `1px solid ${carrier.border}` }}
      >
        {carrier.label}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {pkg.trackingNumber}
          </span>
          <span className="text-xs font-medium" style={{ color: status.color }}>
            {status.label}
          </span>
          {etaLabel && (
            <span
              className="text-xs"
              style={{ color: etaToday ? "var(--accent-orange)" : "var(--text-secondary)" }}
            >
              {etaToday ? "⚡ " : ""}{etaLabel}
            </span>
          )}
        </div>
        {pkg.description && (
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {pkg.description}
          </p>
        )}
        {pkg.statusDetail && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {pkg.statusDetail}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        {pkg.trackingUrl && (
          <a
            href={pkg.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-sm"
            title="Track on carrier site"
          >
            <ExternalLink size={13} />
          </a>
        )}
        {!pkg.delivered && (
          <button
            className="btn-secondary btn-sm"
            title="Mark delivered"
            onClick={() => onMarkDelivered(pkg)}
          >
            <CheckCircle size={13} />
          </button>
        )}
        <button
          className="btn-danger btn-sm"
          title="Remove"
          onClick={() => onDelete(pkg)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
