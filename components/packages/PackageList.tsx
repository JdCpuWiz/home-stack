"use client";

import { useState, useRef } from "react";
import { Truck, PackageCheck, Trash2, Plus, X, Pencil, Check } from "lucide-react";

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
  shipperName: string | null;
  originCity: string | null;
  originState: string | null;
  trackingUrl: string;
  createdAt: string;
  updatedAt: string;
};

const CARRIER_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  USPS: { label: "USPS", bg: "#1a1a3e", color: "#6b9fff", border: "#2a2a5e" },
  UPS:  { label: "UPS",  bg: "#3e2800", color: "#ffb500", border: "#5e3c00" },
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  UNKNOWN:          { label: "Unknown",          color: "var(--text-secondary)" },
  PENDING:          { label: "Pending",           color: "var(--text-secondary)" },
  IN_TRANSIT:       { label: "In Transit",        color: "#6b9fff" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",  color: "var(--accent-orange)" },
  DELIVERED:        { label: "Delivered",         color: "#4ade80" },
  EXCEPTION:        { label: "Exception",         color: "#f87171" },
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
  const diffDays = Math.round((d.getTime() - new Date().getTime()) / 86400000);
  if (isToday(dateStr)) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatUpdated(dateStr: string): string {
  const diffMs = new Date().getTime() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type AddFormState = {
  trackingNumber: string;
  carrier: "USPS" | "UPS";
  description: string;
};

const STATUS_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "out_for_delivery", label: "Out for Delivery", statuses: ["OUT_FOR_DELIVERY"] },
  { key: "on_the_way",       label: "On the Way",       statuses: ["IN_TRANSIT"] },
  { key: "pending",          label: "Pending",          statuses: ["PENDING", "UNKNOWN"] },
  { key: "exception",        label: "Exception",        statuses: ["EXCEPTION"] },
];

export default function PackageList({ initialPackages }: { initialPackages: PackageItem[] }) {
  const [packages, setPackages] = useState<PackageItem[]>(initialPackages);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddFormState>({ trackingNumber: "", carrier: "UPS", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showDelivered, setShowDelivered] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const active = packages.filter((p) => !p.delivered && p.status !== "DELIVERED");
  const delivered = packages.filter((p) => p.delivered || p.status === "DELIVERED");

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleUpdate(updated: PackageItem) {
    setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
        <form onSubmit={handleAdd} className="card mb-6 flex flex-col gap-3" style={{ padding: "1rem" }}>
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
                        onUpdate={handleUpdate}
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
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Inline editable text field — shows value + pencil icon; click pencil to edit */
function InlineEdit({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (val: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function save(e?: React.MouseEvent | React.KeyboardEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setSaving(true);
    await onSave(draft.trim() || null);
    setSaving(false);
    setEditing(false);
  }

  function cancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save(e);
    if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="input"
          style={{ fontSize: "0.75rem", padding: "0.125rem 0.375rem", height: "auto", minWidth: 0, flex: 1, maxWidth: "180px" }}
        />
        <button
          onClick={save}
          disabled={saving}
          title="Save"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", padding: "2px", flexShrink: 0 }}
        >
          <Check size={13} />
        </button>
        <button
          onClick={cancel}
          title="Cancel"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "2px", flexShrink: 0 }}
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs group/edit">
      <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      {value ? (
        <span style={{ color: "var(--text-primary)" }}>{value}</span>
      ) : (
        <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>{placeholder}</span>
      )}
      <button
        onClick={startEdit}
        title={`Edit ${label.toLowerCase().replace(":", "")}`}
        className="opacity-0 group-hover/edit:opacity-100"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "2px", flexShrink: 0, transition: "opacity 0.15s" }}
      >
        <Pencil size={10} />
      </button>
    </div>
  );
}

function PackageCard({
  pkg,
  onMarkDelivered,
  onDelete,
  onUpdate,
}: {
  pkg: PackageItem;
  onMarkDelivered: (p: PackageItem) => void;
  onDelete: (p: PackageItem) => void;
  onUpdate: (p: PackageItem) => void;
}) {
  const carrier = CARRIER_STYLE[pkg.carrier] ?? CARRIER_STYLE.UPS;
  const status = STATUS_STYLE[pkg.status] ?? STATUS_STYLE.UNKNOWN;
  const etaLabel = formatEta(pkg.estimatedDelivery);
  const etaToday = isToday(pkg.estimatedDelivery);
  const updatedLabel = formatUpdated(pkg.updatedAt);

  async function patchField(fields: Partial<Pick<PackageItem, "shipperName" | "description">>) {
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate({ ...pkg, ...updated });
    }
  }

  return (
    <div className="card-surface flex gap-3 items-start" style={{ position: "relative" }}>
      {/* Whole-card tracking link */}
      {pkg.trackingUrl && (
        <a
          href={pkg.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Track ${pkg.trackingNumber}`}
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        />
      )}

      {/* Carrier badge */}
      <div
        className="shrink-0 text-xs font-bold px-2 py-0.5 rounded mt-0.5"
        style={{ position: "relative", zIndex: 1, backgroundColor: carrier.bg, color: carrier.color, border: `1px solid ${carrier.border}` }}
      >
        {carrier.label}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0" style={{ position: "relative", zIndex: 1 }}>
        {/* Tracking number + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {pkg.trackingNumber}
          </span>
          <span className="text-xs font-semibold" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* Editable description */}
        <div className="mt-1" style={{ position: "relative", zIndex: 1 }}>
          <InlineEdit
            label="Description:"
            value={pkg.description}
            placeholder="add description"
            onSave={(val) => patchField({ description: val })}
          />
        </div>

        {/* Detail rows */}
        <div className="flex flex-col gap-0.5 mt-1">
          {etaLabel && (
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--text-secondary)" }}>Expected:</span>
              <span className="font-semibold" style={{ color: etaToday ? "var(--accent-orange)" : "var(--text-primary)" }}>
                {etaToday ? "⚡ Today" : etaLabel}
              </span>
            </div>
          )}

          {pkg.statusDetail && (
            <div className="flex items-start gap-1.5 text-xs">
              <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>Location:</span>
              <span style={{ color: "var(--text-primary)" }}>{pkg.statusDetail}</span>
            </div>
          )}

          {/* Editable sender */}
          <InlineEdit
            label="From:"
            value={pkg.shipperName}
            placeholder="add sender"
            onSave={(val) => patchField({ shipperName: val })}
          />

          <div className="flex items-center gap-1.5 text-xs">
            <span style={{ color: "var(--text-secondary)" }}>Updated:</span>
            <span style={{ color: "var(--text-secondary)" }}>{updatedLabel}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0" style={{ position: "relative", zIndex: 1 }}>
        {!pkg.delivered && (
          <button className="btn-secondary btn-sm" title="Mark delivered" onClick={() => onMarkDelivered(pkg)}>
            <PackageCheck size={13} />
          </button>
        )}
        <button className="btn-danger btn-sm" title="Remove" onClick={() => onDelete(pkg)}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
