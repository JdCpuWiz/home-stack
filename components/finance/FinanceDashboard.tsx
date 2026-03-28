"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Check,
  Pencil,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Lock,
  LockOpen,
  RotateCcw,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

type Entry = {
  id: number;
  itemId: number | null;
  subscriptionId: number | null;
  name: string;
  category: string;
  amount: string;
  payDay: number | null;
  isPaid: boolean;
  paidAt: string | null;
  notes: string | null;
  position: number;
};

type MonthData = {
  id: number;
  year: number;
  month: number;
  netPay: string | null;
  netPayIsManual: boolean;
  archivedAt: string | null;
  entries: Entry[];
};

// ─── Constants ────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "BILLS",
  "SUBSCRIPTIONS",
  "SHARED_CREDIT",
  "MY_CARDS",
  "SHARED_CARDS",
  "LOANS",
  "UNPLANNED",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  BILLS: "Bills",
  SUBSCRIPTIONS: "Subscriptions",
  SHARED_CREDIT: "Shared Credit",
  MY_CARDS: "My Cards",
  SHARED_CARDS: "Shared Cards",
  LOANS: "Loans",
  UNPLANNED: "Unplanned",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ──────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function dueDateColor(payDay: number | null, year: number, month: number, isPaid: boolean): string {
  if (!payDay || isPaid) return "var(--text-secondary)";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(year, month - 1, payDay);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 1) return "#f87171";  // red — due today, tomorrow, or overdue
  if (diffDays <= 5) return "#fbbf24";  // yellow — due within 5 days
  return "var(--text-secondary)";
}

function fmt(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(n)
    ? "$0.00"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ─── Component ────────────────────────────────────────────────────

export default function FinanceDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "ok" | "unavailable"
  >("idle");
  const [conflict, setConflict] = useState<{
    timesheetNetPay: number;
    currentNetPay: number;
  } | null>(null);

  const [editingNetPay, setEditingNetPay] = useState(false);
  const [netPayInput, setNetPayInput] = useState("");
  const [editingAmounts, setEditingAmounts] = useState<Record<number, string>>(
    {}
  );

  const [addingUnplanned, setAddingUnplanned] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newPayDay, setNewPayDay] = useState("");

  // ─── Data loading ───────────────────────────────────────────────

  const loadMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setConflict(null);
    setEditingNetPay(false);
    setEditingAmounts({});
    setAddingUnplanned(false);
    try {
      const res = await fetch(`/api/finance/months/${y}/${m}`);
      if (res.ok) setMonthData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPay = useCallback(async (y: number, m: number) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/finance/months/${y}/${m}/sync-pay`, {
        method: "POST",
      });
      if (!res.ok) { setSyncStatus("unavailable"); return; }
      const data = await res.json();
      if (!data.available) {
        setSyncStatus("unavailable");
        return;
      }
      if (data.conflict) {
        setSyncStatus("idle");
        setConflict({ timesheetNetPay: data.timesheetNetPay, currentNetPay: data.currentNetPay });
        return;
      }
      setSyncStatus("ok");
      setMonthData((prev) =>
        prev
          ? { ...prev, netPay: String(data.timesheetNetPay), netPayIsManual: false }
          : prev
      );
    } catch {
      setSyncStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    loadMonth(year, month).then(() => syncPay(year, month));
  }, [year, month, loadMonth, syncPay]);

  // ─── Month navigation ───────────────────────────────────────────

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  // ─── Net pay ────────────────────────────────────────────────────

  async function acceptTimesheetValue() {
    if (!conflict) return;
    const res = await fetch(`/api/finance/months/${year}/${month}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ netPay: conflict.timesheetNetPay, netPayIsManual: false }),
    });
    if (res.ok) setMonthData(await res.json());
    setConflict(null);
    setSyncStatus("ok");
  }

  async function saveNetPay() {
    const val = parseFloat(netPayInput);
    setEditingNetPay(false);
    if (isNaN(val)) return;
    const res = await fetch(`/api/finance/months/${year}/${month}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ netPay: val, netPayIsManual: true }),
    });
    if (res.ok) setMonthData(await res.json());
  }

  // ─── Entries ────────────────────────────────────────────────────

  async function togglePaid(entryId: number, current: boolean) {
    const res = await fetch(`/api/finance/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !current }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMonthData((prev) =>
        prev
          ? { ...prev, entries: prev.entries.map((e) => e.id === entryId ? { ...e, ...updated } : e) }
          : prev
      );
    }
  }

  async function saveAmount(entryId: number) {
    const raw = editingAmounts[entryId] ?? "";
    setEditingAmounts((prev) => { const n = { ...prev }; delete n[entryId]; return n; });
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    const res = await fetch(`/api/finance/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: val }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMonthData((prev) =>
        prev
          ? { ...prev, entries: prev.entries.map((e) => e.id === entryId ? { ...e, ...updated } : e) }
          : prev
      );
    }
  }

  async function deleteEntry(entryId: number, name: string) {
    if (!confirm(`Remove "${name}"?`)) return;
    const res = await fetch(`/api/finance/entries/${entryId}`, { method: "DELETE" });
    if (res.ok) {
      setMonthData((prev) =>
        prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== entryId) } : prev
      );
    }
  }

  async function addUnplanned() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/finance/months/${year}/${month}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        amount: parseFloat(newAmount) || 0,
        category: "UNPLANNED",
        payDay: newPayDay ? parseInt(newPayDay) : null,
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      setMonthData((prev) =>
        prev ? { ...prev, entries: [...prev.entries, entry] } : prev
      );
      setNewName(""); setNewAmount(""); setNewPayDay(""); setAddingUnplanned(false);
    }
  }

  // ─── Month actions ──────────────────────────────────────────────

  async function clearDefaults() {
    if (!confirm("Remove all budget item entries? Unplanned entries will be kept.")) return;
    try {
      const res = await fetch(`/api/finance/months/${year}/${month}/clear-defaults`, { method: "POST" });
      if (res.ok) {
        setMonthData(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        alert(`Clear Defaults failed (${res.status}): ${body.error ?? "unknown error"}`);
      }
    } catch (e) {
      alert(`Clear Defaults error: ${e}`);
    }
  }

  async function loadDefaults() {
    try {
      const res = await fetch(`/api/finance/months/${year}/${month}/load-defaults`, { method: "POST" });
      if (res.ok) {
        setMonthData(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        alert(`Load Defaults failed (${res.status}): ${body.error ?? "unknown error"}`);
      }
    } catch (e) {
      alert(`Load Defaults error: ${e}`);
    }
  }

  async function toggleArchive() {
    const isArchived = !!monthData?.archivedAt;
    if (!isArchived && !confirm("Lock this month? You can unlock it later.")) return;
    try {
      const res = await fetch(`/api/finance/months/${year}/${month}/archive`, { method: "POST" });
      if (res.ok) {
        setMonthData(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        alert(`Archive failed (${res.status}): ${body.error ?? "unknown error"}`);
      }
    } catch (e) {
      alert(`Archive error: ${e}`);
    }
  }

  // ─── Derived values ─────────────────────────────────────────────

  const isArchived = !!monthData?.archivedAt;
  const entries = monthData?.entries ?? [];
  const netPay = monthData?.netPay ? parseFloat(monthData.netPay) : null;
  const totalCommitted = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalPaid = entries.filter((e) => e.isPaid).reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const balance = netPay != null ? netPay - totalCommitted : null;

  const entriesByCategory: Record<string, Entry[]> = {};
  for (const cat of CATEGORY_ORDER) {
    entriesByCategory[cat] = entries.filter((e) => e.category === cat);
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Page header + month nav */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Finance
        </h1>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="btn-secondary btn-sm p-1.5" title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span
            className="text-sm font-semibold px-3 py-1 rounded"
            style={{
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-200)",
              minWidth: "150px",
              textAlign: "center",
              display: "block",
            }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="btn-secondary btn-sm p-1.5" title="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Conflict resolution banner */}
      {conflict && (
        <div
          className="mb-4 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ backgroundColor: "#92400e20", border: "1px solid #d97706" }}
        >
          <div className="flex items-start gap-2 text-sm" style={{ color: "#fbbf24" }}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>
              Timesheet shows <strong>{fmt(conflict.timesheetNetPay)}</strong> but
              you entered <strong>{fmt(conflict.currentNetPay)}</strong> manually.
              Which value should be used?
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={acceptTimesheetValue} className="btn-primary btn-sm">
              Use Timesheet
            </button>
            <button onClick={() => setConflict(null)} className="btn-secondary btn-sm">
              Keep Manual
            </button>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div
        className="card mb-6 grid grid-cols-3"
        style={{ borderColor: "var(--bg-300)", overflow: "hidden" }}
      >
        {/* Net Pay */}
        <div
          className="p-4 text-center"
          style={{ borderRight: "1px solid var(--bg-300)" }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Net Pay
            </span>
            {syncStatus === "syncing" && (
              <span title="Syncing with timesheet…"><RefreshCw size={11} className="animate-spin" style={{ color: "var(--text-secondary)" }} /></span>
            )}
            {syncStatus === "ok" && (
              <span title="Synced with timesheet"><Wifi size={11} style={{ color: "#4ade80" }} /></span>
            )}
            {syncStatus === "unavailable" && (
              <span title="Timesheet unavailable"><WifiOff size={11} style={{ color: "#f87171" }} /></span>
            )}
          </div>

          {editingNetPay ? (
            <div className="flex items-center justify-center gap-1">
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>$</span>
              <input
                autoFocus
                className="input text-center font-bold w-28"
                style={{ fontSize: "1.1rem" }}
                value={netPayInput}
                onChange={(e) => setNetPayInput(e.target.value)}
                onBlur={saveNetPay}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNetPay();
                  if (e.key === "Escape") setEditingNetPay(false);
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => {
                if (isArchived) return;
                setEditingNetPay(true);
                setNetPayInput(netPay != null ? netPay.toFixed(2) : "");
              }}
              className="flex items-center justify-center gap-1.5 mx-auto group"
              style={{ cursor: isArchived ? "default" : "pointer" }}
              title={isArchived ? "Month is locked" : "Click to edit net pay"}
            >
              <span
                className="text-lg font-bold"
                style={{ color: netPay != null ? "#4ade80" : "var(--text-secondary)" }}
              >
                {netPay != null ? fmt(netPay) : "—"}
              </span>
              {!isArchived && (
                <Pencil
                  size={12}
                  className="opacity-30 group-hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                />
              )}
            </button>
          )}

          {monthData?.netPayIsManual && (
            <div className="text-xs mt-0.5" style={{ color: "#fbbf24" }}>
              manual
            </div>
          )}
          {syncStatus === "unavailable" && !monthData?.netPayIsManual && netPay == null && (
            <div className="text-xs mt-0.5" style={{ color: "#f87171" }}>
              unavailable — click to enter
            </div>
          )}
        </div>

        {/* Total Committed */}
        <div
          className="p-4 text-center"
          style={{ borderRight: "1px solid var(--bg-300)" }}
        >
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            Committed
          </div>
          <div className="text-lg font-bold" style={{ color: "var(--accent-orange)" }}>
            {fmt(totalCommitted)}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {entries.filter((e) => e.isPaid).length}/{entries.length} paid
          </div>
        </div>

        {/* Balance */}
        <div className="p-4 text-center">
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
            Balance
          </div>
          <div
            className="text-lg font-bold"
            style={{
              color:
                balance != null
                  ? balance >= 0
                    ? "#4ade80"
                    : "#f87171"
                  : "var(--text-secondary)",
            }}
          >
            {balance != null ? fmt(balance) : "—"}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {fmt(totalPaid)} paid out
          </div>
        </div>
      </div>

      {/* Archived banner */}
      {isArchived && (
        <div
          className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
          style={{ backgroundColor: "#1e293b", border: "1px solid #475569", color: "#94a3b8" }}
        >
          <Lock size={13} />
          This month is locked. Unlock to make changes.
        </div>
      )}

      {/* Action buttons */}
      {!loading && monthData && (
        <div className="flex flex-wrap gap-2 mb-5">
          {!isArchived && (
            <>
              <button
                onClick={clearDefaults}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Remove all budget item entries (keep unplanned)"
              >
                <RotateCcw size={13} />
                Clear Defaults
              </button>
              <button
                onClick={loadDefaults}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Re-add any missing budget items from settings"
              >
                <Download size={13} />
                Load Defaults
              </button>
            </>
          )}
          <button
            onClick={toggleArchive}
            className={isArchived ? "btn-secondary btn-sm flex items-center gap-1.5" : "btn-secondary btn-sm flex items-center gap-1.5"}
            style={isArchived ? { borderColor: "#4ade80", color: "#4ade80" } : {}}
            title={isArchived ? "Unlock this month" : "Lock and archive this month"}
          >
            {isArchived ? <LockOpen size={13} /> : <Lock size={13} />}
            {isArchived ? "Unlock Month" : "Complete Month"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
          Loading...
        </div>
      )}

      {/* Category sections */}
      {!loading &&
        CATEGORY_ORDER.map((cat) => {
          const catEntries = entriesByCategory[cat] ?? [];
          if (cat !== "UNPLANNED" && catEntries.length === 0) return null;

          const catTotal = catEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
          const catPaid = catEntries.filter((e) => e.isPaid).length;

          return (
            <div key={cat} className="mb-4">
              {/* Section header — columns mirror row layout for alignment */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-t-lg"
                style={{ backgroundColor: "var(--bg-300)" }}
              >
                {/* checkbox placeholder */}
                <span className="w-5 shrink-0" />
                {/* category name */}
                <span
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-primary)" }}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
                {/* paid count — aligns with due-date column */}
                <span className="text-xs w-16 text-right shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {catPaid}/{catEntries.length} paid
                </span>
                {/* total — aligns with amount column */}
                <span
                  className="text-sm font-semibold tabular-nums w-24 text-right shrink-0"
                  style={{ color: "var(--accent-orange)" }}
                >
                  {fmt(catTotal)}
                </span>
                {/* delete-button placeholder */}
                <span className="w-[13px] shrink-0" />
              </div>

              {/* Rows */}
              <div
                className="rounded-b-lg overflow-hidden"
                style={{ border: "1px solid var(--bg-300)", borderTop: "none" }}
              >
                {catEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      backgroundColor:
                        idx % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                    }}
                  >
                    {/* Paid checkbox */}
                    <button
                      onClick={() => !isArchived && togglePaid(entry.id, entry.isPaid)}
                      className={`shrink-0 flex items-center justify-center w-5 h-5 rounded transition-all${!isArchived ? " hover:scale-110 hover:brightness-125" : ""}`}
                      style={{
                        border: `1.5px solid ${entry.isPaid ? "#4ade80" : "var(--bg-400)"}`,
                        backgroundColor: entry.isPaid ? "#4ade8025" : "transparent",
                        cursor: isArchived ? "default" : "pointer",
                        opacity: isArchived ? 0.6 : 1,
                      }}
                      title={isArchived ? "Month is locked" : entry.isPaid ? "Mark as unpaid" : "Mark as paid"}
                    >
                      {entry.isPaid && <Check size={11} style={{ color: "#4ade80" }} />}
                    </button>

                    {/* Name */}
                    <span
                      className="flex-1 flex items-center gap-1.5 text-sm truncate min-w-0"
                      style={{
                        color: entry.isPaid ? "var(--text-secondary)" : "var(--text-primary)",
                        textDecoration: entry.isPaid ? "line-through" : "none",
                        opacity: entry.isPaid ? 0.65 : 1,
                      }}
                    >
                      {entry.subscriptionId != null && (
                        <RefreshCw
                          size={10}
                          className="shrink-0 opacity-50"
                          title="Auto-populated from Subscriptions"
                        />
                      )}
                      <span className="truncate">{entry.name}</span>
                    </span>

                    {/* Pay day */}
                    <span
                      className="text-xs w-16 text-right shrink-0 font-medium"
                      style={{ color: dueDateColor(entry.payDay, year, month, entry.isPaid) }}
                      title={entry.payDay ? `Due on the ${ordinal(entry.payDay)}` : undefined}
                    >
                      {entry.payDay ? `due ${ordinal(entry.payDay)}` : "—"}
                    </span>

                    {/* Amount — inline editable (disabled when archived) */}
                    <div className="w-24 text-right shrink-0">
                      {!isArchived && editingAmounts[entry.id] !== undefined ? (
                        <input
                          autoFocus
                          className="input text-right text-sm w-full"
                          value={editingAmounts[entry.id]}
                          onChange={(e) =>
                            setEditingAmounts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                          }
                          onBlur={() => saveAmount(entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveAmount(entry.id);
                            if (e.key === "Escape")
                              setEditingAmounts((prev) => {
                                const n = { ...prev }; delete n[entry.id]; return n;
                              });
                          }}
                        />
                      ) : (
                        <button
                          onClick={() =>
                            !isArchived &&
                            setEditingAmounts((prev) => ({
                              ...prev,
                              [entry.id]: parseFloat(entry.amount).toFixed(2),
                            }))
                          }
                          className={`text-sm font-medium tabular-nums transition-opacity${!isArchived ? " hover:opacity-70 hover:underline" : ""}`}
                          style={{
                            color: "var(--text-primary)",
                            cursor: isArchived ? "default" : "pointer",
                          }}
                          title={isArchived ? "Month is locked" : "Click to edit amount"}
                        >
                          {fmt(entry.amount)}
                        </button>
                      )}
                    </div>

                    {/* Delete — all entries, hidden when archived */}
                    {!isArchived ? (
                      <button
                        onClick={() => deleteEntry(entry.id, entry.name)}
                        className="shrink-0 opacity-0 hover:opacity-80 transition-opacity"
                        style={{ color: "#f87171" }}
                        title={`Remove "${entry.name}"`}
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="shrink-0 w-[13px]" />
                    )}
                  </div>
                ))}

                {/* UNPLANNED: add form (hidden when archived) */}
                {cat === "UNPLANNED" && !isArchived && (
                  <>
                    {addingUnplanned ? (
                      <div
                        className="flex items-center gap-2 px-3 py-2.5"
                        style={{
                          backgroundColor:
                            catEntries.length % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                        }}
                      >
                        <input
                          autoFocus
                          className="input flex-1 text-sm"
                          placeholder="Description"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addUnplanned();
                            if (e.key === "Escape") setAddingUnplanned(false);
                          }}
                        />
                        <input
                          className="input w-24 text-right text-sm"
                          placeholder="0.00"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addUnplanned();
                            if (e.key === "Escape") setAddingUnplanned(false);
                          }}
                        />
                        <button onClick={addUnplanned} className="btn-primary btn-sm">
                          Add
                        </button>
                        <button
                          onClick={() => setAddingUnplanned(false)}
                          className="btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingUnplanned(true)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors"
                        style={{
                          color: "var(--text-secondary)",
                          backgroundColor:
                            catEntries.length % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "var(--bg-300)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            catEntries.length % 2 === 0 ? "var(--bg-100)" : "var(--bg-200)")
                        }
                      >
                        <Plus size={13} />
                        Add unplanned expense
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
