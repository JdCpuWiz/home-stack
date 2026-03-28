"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getNextRenewalDate,
  getRenewalStatus,
  FREQUENCY_LABELS,
  FREQUENCY_MONTHS,
} from "@/lib/subscriptionUtils";

// ─── Types ────────────────────────────────────────────────────────

type Subscription = {
  id: number;
  name: string;
  cost: string;
  frequency: "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL";
  renewalDate: string;
  paymentMethod: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
};

// ─── Constants ────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUAL", label: "Every 6 months" },
  { value: "ANNUAL", label: "Annual" },
];

const STATUS_STYLES = {
  red:    { dot: "#b91c1c", text: "#f87171",  label: "Renews this month" },
  yellow: { dot: "#eab308", text: "#fbbf24",  label: "Renews within 30 days" },
  green:  { dot: "#15803d", text: "#4ade80",  label: "Renewal not due soon" },
};

// ─── Helpers ──────────────────────────────────────────────────────

function fmt(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(n) ? "$0.00" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(d: Date): string {
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// ─── Component ────────────────────────────────────────────────────

export default function SubscriptionList() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [frequency, setFrequency] = useState<Subscription["frequency"]>("MONTHLY");
  const [renewalDate, setRenewalDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then(setSubs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing(null);
    setName(""); setCost(""); setFrequency("MONTHLY"); setRenewalDate("");
    setPaymentMethod(""); setWebsite(""); setNotes(""); setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setName(sub.name);
    setCost(parseFloat(sub.cost).toFixed(2));
    setFrequency(sub.frequency);
    setRenewalDate(sub.renewalDate.slice(0, 10));
    setPaymentMethod(sub.paymentMethod ?? "");
    setWebsite(sub.website ?? "");
    setNotes(sub.notes ?? "");
    setIsActive(sub.isActive);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !renewalDate) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        cost: parseFloat(cost) || 0,
        frequency,
        renewalDate,
        paymentMethod: paymentMethod || null,
        website: website || null,
        notes: notes || null,
        ...(editing && { isActive }),
      };
      const res = await fetch(
        editing ? `/api/subscriptions/${editing.id}` : "/api/subscriptions",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) return;
      const saved: Subscription = await res.json();
      setSubs((prev) =>
        editing ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved]
      );
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sub: Subscription) {
    if (!confirm(`Delete "${sub.name}"?`)) return;
    const res = await fetch(`/api/subscriptions/${sub.id}`, { method: "DELETE" });
    if (res.ok) setSubs((prev) => prev.filter((s) => s.id !== sub.id));
  }

  // ── Summary stats ────────────────────────────────────────────────
  const activeSubs = subs.filter((s) => s.isActive);
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const interval = FREQUENCY_MONTHS[s.frequency] ?? 1;
    return sum + parseFloat(s.cost) / interval;
  }, 0);
  const annualTotal = monthlyTotal * 12;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Subscriptions
        </h1>
        <button onClick={openAdd} className="btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={14} />
          Add Subscription
        </button>
      </div>

      {/* Summary */}
      {activeSubs.length > 0 && (
        <div
          className="card mb-6 grid grid-cols-3"
          style={{ borderColor: "var(--bg-300)", overflow: "hidden" }}
        >
          <div className="p-4 text-center" style={{ borderRight: "1px solid var(--bg-300)" }}>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
              Monthly Cost
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--accent-orange)" }}>
              {fmt(monthlyTotal)}
            </div>
          </div>
          <div className="p-4 text-center" style={{ borderRight: "1px solid var(--bg-300)" }}>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
              Annual Cost
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--accent-orange)" }}>
              {fmt(annualTotal)}
            </div>
          </div>
          <div className="p-4 text-center">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
              Active
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {activeSubs.length}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
          Loading...
        </div>
      )}

      {/* Empty */}
      {!loading && subs.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
          No subscriptions yet. Add one to get started.
        </div>
      )}

      {/* Table */}
      {!loading && subs.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--bg-300)" }}>
          {/* Column headers */}
          <div
            className="flex items-center gap-3 px-3 py-2"
            style={{ backgroundColor: "var(--bg-300)" }}
          >
            <span className="w-2 shrink-0" />
            <span className="flex-1 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Name
            </span>
            <span className="text-xs font-bold uppercase tracking-wider w-20 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
              Freq
            </span>
            <span className="text-xs font-bold uppercase tracking-wider w-24 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
              Next
            </span>
            <span className="text-xs font-bold uppercase tracking-wider w-20 text-right shrink-0" style={{ color: "var(--text-primary)" }}>
              Cost
            </span>
            <span className="w-[42px] shrink-0" />
          </div>

          {/* Rows */}
          {subs.map((sub, idx) => {
            const nextDate = getNextRenewalDate(sub.renewalDate, sub.frequency);
            const status = sub.isActive
              ? getRenewalStatus(sub.renewalDate, sub.frequency)
              : null;
            const styles = status ? STATUS_STYLES[status] : null;

            return (
              <div
                key={sub.id}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{
                  backgroundColor: idx % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                  opacity: sub.isActive ? 1 : 0.55,
                }}
              >
                {/* Status dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: styles?.dot ?? "#6b7280" }}
                  title={styles?.label ?? "Inactive"}
                />

                {/* Name + sub-details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {sub.name}
                    </span>
                    {!sub.isActive && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{ backgroundColor: "#6b7280", color: "#ffffff" }}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                  {(sub.paymentMethod || sub.website) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {sub.paymentMethod && (
                        <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {sub.paymentMethod}
                        </span>
                      )}
                      {sub.website && (
                        <a
                          href={sub.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                          style={{ color: "var(--accent-orange)" }}
                          onClick={(e) => e.stopPropagation()}
                          title={sub.website}
                        >
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Frequency */}
                <span
                  className="text-xs w-20 text-right shrink-0"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {FREQUENCY_LABELS[sub.frequency]}
                </span>

                {/* Next renewal */}
                <span
                  className="text-xs w-24 text-right shrink-0 font-medium"
                  style={{ color: styles?.text ?? "var(--text-secondary)" }}
                >
                  {formatDate(nextDate)}
                </span>

                {/* Cost */}
                <span
                  className="text-sm font-medium tabular-nums w-20 text-right shrink-0"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fmt(sub.cost)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 w-[42px] justify-end">
                  <button
                    onClick={() => openEdit(sub)}
                    className="opacity-40 hover:opacity-90 transition-opacity p-1"
                    style={{ color: "var(--text-secondary)" }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(sub)}
                    className="opacity-40 hover:opacity-90 transition-opacity p-1"
                    style={{ color: "#f87171" }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            {/* Name */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Name *
              </label>
              <input
                className="input w-full"
                placeholder="Netflix, GitHub Pro, iCloud…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            {/* Cost + Frequency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Cost *
                </label>
                <input
                  className="input w-full"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Frequency *
                </label>
                <select
                  className="input w-full"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Subscription["frequency"])}
                >
                  {FREQ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Renewal date */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Renewal Date *{" "}
                <span className="font-normal opacity-70">— anchor date used to compute future renewals</span>
              </label>
              <input
                className="input w-full"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Payment Method
              </label>
              <input
                className="input w-full"
                placeholder="Chase Sapphire, PayPal, Apple ID…"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>

            {/* Website */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Website
              </label>
              <input
                className="input w-full"
                type="url"
                placeholder="https://…"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                Notes
              </label>
              <textarea
                className="input w-full resize-none"
                rows={2}
                placeholder="Optional notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Active toggle (edit only) */}
            {editing && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>Active</span>
              </label>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setModalOpen(false)} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !renewalDate}
                className="btn-primary btn-sm"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Subscription"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
