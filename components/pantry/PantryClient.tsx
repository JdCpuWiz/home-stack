"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera, ShoppingCart, Pencil, Trash2, AlertTriangle,
  Plus, Minus, Check, X, ScanLine, Package,
} from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScannerModal = dynamic(() => import("./BarcodeScannerModal"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────

type PantryProduct = {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  size: string | null;
  photoUrl: string | null;
  category: string | null;
  quantity: number;
  minQty: number;
};

type LookupResult =
  | { exists: true; product: PantryProduct }
  | {
      exists: false;
      apiData: { name: string; brand?: string; size?: string; photoUrl?: string; category?: string } | null;
    };

type Store = { id: number; name: string };

type ScanMode = "in" | "out";

// ─── Helpers ──────────────────────────────────────────────────────

function isLowStock(p: PantryProduct) {
  return p.quantity <= p.minQty;
}

function ProductPhoto({ url, name, size = 48 }: { url: string | null; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="rounded shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: "var(--bg-300)", color: "var(--text-secondary)" }}
    >
      <Package size={size * 0.45} />
    </div>
  );
}

// ─── Add-to-list modal ────────────────────────────────────────────

function AddToListModal({
  product,
  onClose,
  onAdded,
}: {
  product: PantryProduct;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/grocery/stores")
      .then((r) => r.json())
      .then((data: Store[]) => {
        setStores(data);
        if (data.length === 1) setSelectedStoreId(data[0].id);
      })
      .catch(() => setError("Failed to load stores"));
  }, []);

  async function handleSubmit() {
    if (!selectedStoreId) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/pantry/${product.id}/add-to-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: selectedStoreId }),
    });
    if (res.status === 409) {
      setError("Already on that list");
      setSubmitting(false);
      return;
    }
    if (!res.ok) {
      setError("Failed to add to list");
      setSubmitting(false);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl"
        style={{ backgroundColor: "var(--bg-100)", border: "1px solid var(--bg-300)" }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--bg-300)" }}
        >
          <span className="font-semibold">Add to Grocery List</span>
          <button onClick={onClose} className="btn-secondary btn-sm p-1.5">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Adding: <span style={{ color: "var(--text-primary)" }}>{product.name}</span>
            {product.size && <span> · {product.size}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Select Store
            </label>
            {stores.length === 0 && !error && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
            )}
            {stores.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStoreId(s.id)}
                className="text-left px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: selectedStoreId === s.id ? "var(--bg-300)" : "var(--bg-200)",
                  border: selectedStoreId === s.id ? "1px solid var(--accent-orange)" : "1px solid var(--bg-300)",
                  color: "var(--text-primary)",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary btn-sm px-4">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!selectedStoreId || submitting}
              className="btn-primary btn-sm px-4"
              style={{ opacity: !selectedStoreId || submitting ? 0.5 : 1 }}
            >
              {submitting ? "Adding…" : "Add to List"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit product modal ───────────────────────────────────────────

function EditProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: PantryProduct;
  onClose: () => void;
  onSaved: (updated: PantryProduct) => void;
}) {
  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [size, setSize] = useState(product.size ?? "");
  const [minQty, setMinQty] = useState(String(product.minQty));
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/pantry/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        brand: brand.trim() || null,
        size: size.trim() || null,
        minQty: parseInt(minQty) || 1,
        quantity: parseInt(quantity) || 0,
      }),
    });
    if (!res.ok) { setError("Failed to save"); setSubmitting(false); return; }
    const updated = await res.json();
    onSaved(updated);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl"
        style={{ backgroundColor: "var(--bg-100)", border: "1px solid var(--bg-300)" }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--bg-300)" }}
        >
          <span className="font-semibold">Edit Product</span>
          <button onClick={onClose} className="btn-secondary btn-sm p-1.5"><X size={16} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Brand</label>
            <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Size / Weight</label>
            <input className="input" value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Current Qty</label>
              <input className="input" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Min Qty (reorder)</label>
              <input className="input" type="number" min="0" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="btn-secondary btn-sm px-4">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || submitting}
              className="btn-primary btn-sm px-4"
              style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scan result card ─────────────────────────────────────────────

function ScanResultCard({
  barcode,
  result,
  mode,
  onConfirm,
  onCancel,
}: {
  barcode: string;
  result: LookupResult;
  mode: ScanMode;
  onConfirm: (delta: number, productData?: object) => Promise<void>;
  onCancel: () => void;
}) {
  const [delta, setDelta] = useState(1);
  const [name, setName] = useState(result.exists ? result.product.name : result.apiData?.name ?? "");
  const [brand, setBrand] = useState(result.exists ? (result.product.brand ?? "") : (result.apiData?.brand ?? ""));
  const [size, setSize] = useState(result.exists ? (result.product.size ?? "") : (result.apiData?.size ?? ""));
  const [minQty, setMinQty] = useState(result.exists ? result.product.minQty : 1);
  const [submitting, setSubmitting] = useState(false);

  const isNew = !result.exists;
  const product = result.exists ? result.product : null;
  const apiData = !result.exists ? result.apiData : null;
  const photoUrl = product?.photoUrl ?? apiData?.photoUrl ?? null;
  const effectiveDelta = mode === "in" ? delta : -delta;
  const newQty = product ? Math.max(0, product.quantity + effectiveDelta) : Math.max(0, effectiveDelta);

  async function handleConfirm() {
    if (!name.trim()) return;
    setSubmitting(true);
    await onConfirm(effectiveDelta, isNew ? {
      name: name.trim(),
      brand: brand.trim() || undefined,
      size: size.trim() || undefined,
      photoUrl: apiData?.photoUrl,
      category: apiData?.category,
      minQty,
    } : undefined);
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ backgroundColor: "var(--bg-100)", border: "1px solid var(--bg-300)" }}
    >
      {/* Product info */}
      <div className="flex items-start gap-3">
        <ProductPhoto url={photoUrl} name={name} size={56} />
        <div className="flex-1 min-w-0">
          {isNew ? (
            <div className="flex flex-col gap-2">
              <div
                className="text-xs font-semibold px-2 py-0.5 rounded self-start"
                style={{ backgroundColor: "#1d4ed8", color: "#fff" }}
              >
                New Product
              </div>
              <input
                className="input text-sm"
                placeholder="Product name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  className="input text-sm flex-1"
                  placeholder="Brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
                <input
                  className="input text-sm flex-1"
                  placeholder="Size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Min qty:</label>
                <input
                  className="input text-sm w-16"
                  type="number"
                  min="0"
                  value={minQty}
                  onChange={(e) => setMinQty(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="font-semibold text-sm leading-tight truncate">{product!.name}</p>
              {(product!.brand || product!.size) && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {[product!.brand, product!.size].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Stock:</span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{product!.quantity}</span>
                <span style={{ color: "var(--text-secondary)" }}>→</span>
                <span
                  className="font-bold"
                  style={{ color: newQty <= product!.minQty ? "#eab308" : "#4ade80" }}
                >
                  {newQty}
                </span>
                {newQty <= product!.minQty && (
                  <span className="text-xs" style={{ color: "#eab308" }}>⚠ below min ({product!.minQty})</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Qty delta */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          {mode === "in" ? "Adding:" : "Removing:"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDelta((d) => Math.max(1, d - 1))}
            className="btn-secondary btn-sm p-1.5"
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="1"
            value={delta}
            onChange={(e) => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
            className="input text-center font-bold"
            style={{ width: "3.5rem" }}
          />
          <button
            onClick={() => setDelta((d) => d + 1)}
            className="btn-secondary btn-sm p-1.5"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary btn-sm px-4 flex items-center gap-1.5">
          <X size={14} /> Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!name.trim() || submitting}
          className="btn-primary flex-1 btn-sm flex items-center justify-center gap-1.5"
          style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}
        >
          <Check size={14} />
          {submitting ? "Saving…" : mode === "in" ? `Scan In (+${delta})` : `Scan Out (−${delta})`}
        </button>
      </div>
    </div>
  );
}

// ─── Product row ──────────────────────────────────────────────────

function ProductRow({
  product,
  onEdit,
  onDelete,
  onAddToList,
  onQtyChange,
}: {
  product: PantryProduct;
  onEdit: () => void;
  onDelete: () => void;
  onAddToList: () => void;
  onQtyChange: (newQty: number) => void;
}) {
  const low = isLowStock(product);

  async function adjustQty(delta: number) {
    const newQty = Math.max(0, product.quantity + delta);
    const res = await fetch(`/api/pantry/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
    if (res.ok) onQtyChange(newQty);
  }

  return (
    <div
      className="card-surface rounded-xl p-3 flex items-center gap-3"
      style={{ border: low ? "1px solid #854d0e" : "1px solid var(--bg-300)" }}
    >
      <ProductPhoto url={product.photoUrl} name={product.name} size={44} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{product.name}</p>
          {low && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"
              style={{ backgroundColor: "#eab308", color: "#000" }}
            >
              <AlertTriangle size={10} /> Low
            </span>
          )}
        </div>
        {(product.brand || product.size) && (
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {[product.brand, product.size].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Min: {product.minQty}
        </p>
      </div>

      {/* Qty control */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => adjustQty(-1)} className="btn-secondary p-1" style={{ borderRadius: "6px" }}>
          <Minus size={12} />
        </button>
        <span
          className="text-sm font-bold text-center"
          style={{ minWidth: "1.75rem", color: low ? "#eab308" : "var(--text-primary)" }}
        >
          {product.quantity}
        </span>
        <button onClick={() => adjustQty(1)} className="btn-secondary p-1" style={{ borderRadius: "6px" }}>
          <Plus size={12} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onAddToList}
          className="btn-secondary p-1.5"
          style={{ borderRadius: "6px" }}
          title="Add to grocery list"
        >
          <ShoppingCart size={14} />
        </button>
        <button
          onClick={onEdit}
          className="btn-secondary p-1.5"
          style={{ borderRadius: "6px" }}
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="btn-secondary p-1.5"
          style={{ borderRadius: "6px", color: "#ef4444" }}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function PantryClient({ initialProducts }: { initialProducts: PantryProduct[] }) {
  const [products, setProducts] = useState<PantryProduct[]>(initialProducts);
  const [scanMode, setScanMode] = useState<ScanMode>("in");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<LookupResult | null>(null);
  const [editingProduct, setEditingProduct] = useState<PantryProduct | null>(null);
  const [addingToList, setAddingToList] = useState<PantryProduct | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const lowStockProducts = products.filter(isLowStock);
  const filteredProducts = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  const handleBarcode = useCallback(
    async (barcode: string) => {
      const trimmed = barcode.trim();
      if (!trimmed) return;
      setScanning(true);
      setBarcodeInput("");
      setPendingBarcode(trimmed);
      try {
        const res = await fetch(`/api/pantry/lookup/${encodeURIComponent(trimmed)}`);
        const data: LookupResult = await res.json();
        setScanResult(data);
      } catch {
        showToast("Lookup failed", "err");
        setPendingBarcode(null);
      } finally {
        setScanning(false);
      }
    },
    []
  );

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleBarcode(barcodeInput);
    }
  }

  function handleCameraDetected(barcode: string) {
    setShowCamera(false);
    handleBarcode(barcode);
  }

  function clearScan() {
    setScanResult(null);
    setPendingBarcode(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleConfirmScan(delta: number, productData?: object) {
    if (!pendingBarcode) return;
    const res = await fetch("/api/pantry/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: pendingBarcode, delta, productData }),
    });
    if (!res.ok) {
      showToast("Failed to update stock", "err");
      return;
    }
    const updated: PantryProduct = await res.json();
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    showToast(
      `${updated.name}: ${delta > 0 ? "+" : ""}${delta} → ${updated.quantity} in stock`
    );
    clearScan();
  }

  async function handleDelete(product: PantryProduct) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    const res = await fetch(`/api/pantry/${product.id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`${product.name} removed`);
    } else {
      showToast("Delete failed", "err");
    }
  }

  function handleEditSaved(updated: PantryProduct) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    showToast("Saved");
  }

  function handleQtyChange(id: number, newQty: number) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: newQty } : p))
    );
  }

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Pantry</h1>

      {/* Scan bar */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: "var(--bg-100)", border: "1px solid var(--bg-300)" }}
      >
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setScanMode("in")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: scanMode === "in" ? "#15803d" : "var(--bg-200)",
              color: scanMode === "in" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Scan In
          </button>
          <button
            onClick={() => setScanMode("out")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: scanMode === "out" ? "#b91c1c" : "var(--bg-200)",
              color: scanMode === "out" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Scan Out
          </button>
        </div>

        {/* Barcode input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-secondary)" }}
            />
            <input
              ref={inputRef}
              className="input w-full pl-9"
              placeholder={scanning ? "Looking up…" : "Scan or type barcode, then Enter"}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              disabled={scanning || !!scanResult}
            />
          </div>
          <button
            onClick={() => setShowCamera(true)}
            className="btn-secondary p-2.5"
            title="Camera scan"
            disabled={scanning || !!scanResult}
          >
            <Camera size={18} />
          </button>
        </div>

        {/* Scan result */}
        {scanResult && pendingBarcode && (
          <ScanResultCard
            barcode={pendingBarcode}
            result={scanResult}
            mode={scanMode}
            onConfirm={handleConfirmScan}
            onCancel={clearScan}
          />
        )}
      </div>

      {/* Low stock section */}
      {lowStockProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: "#eab308" }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#eab308" }}>
              Low Stock ({lowStockProducts.length})
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {lowStockProducts.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onEdit={() => setEditingProduct(p)}
                onDelete={() => handleDelete(p)}
                onAddToList={() => setAddingToList(p)}
                onQtyChange={(qty) => handleQtyChange(p.id, qty)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            All Items ({products.length})
          </h2>
          <input
            className="input text-sm"
            style={{ width: "160px" }}
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filteredProducts.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center text-sm"
            style={{ backgroundColor: "var(--bg-100)", color: "var(--text-secondary)" }}
          >
            {products.length === 0
              ? "No products yet — scan a barcode to get started"
              : "No products match your search"}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProducts.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onEdit={() => setEditingProduct(p)}
                onDelete={() => handleDelete(p)}
                onAddToList={() => setAddingToList(p)}
                onQtyChange={(qty) => handleQtyChange(p.id, qty)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCamera && (
        <BarcodeScannerModal
          onDetected={handleCameraDetected}
          onClose={() => setShowCamera(false)}
        />
      )}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleEditSaved}
        />
      )}
      {addingToList && (
        <AddToListModal
          product={addingToList}
          onClose={() => setAddingToList(null)}
          onAdded={() => showToast(`${addingToList.name} added to list`)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-semibold z-50 shadow-lg"
          style={{
            backgroundColor: toast.type === "ok" ? "#15803d" : "#b91c1c",
            color: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
