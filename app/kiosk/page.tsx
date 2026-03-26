"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ScanLine, Package, Check, X, Loader2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScanMode = "in" | "out";

interface KioskProduct {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  size: string | null;
  photoUrl: string | null;
  category: string | null;
  quantity: number;
  minQty: number;
}

type KioskState =
  | { status: "idle" }
  | { status: "processing"; barcode: string }
  | { status: "found"; product: KioskProduct; mode: ScanMode; addedToGroceryLists: string[] }
  | { status: "autocreated"; product: KioskProduct; mode: ScanMode; addedToGroceryLists: string[] }
  | { status: "not_found"; barcode: string };

interface ScanEntry {
  barcode: string;
  name: string | null;
  mode: ScanMode;
  newQty: number | null;
  result: "found" | "autocreated" | "not_found";
  timestamp: Date;
}

// ─── Audio ───────────────────────────────────────────────────────────────────

function playTone(type: "success" | "fail") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === "success" ? 1200 : 400;
    osc.type = type === "success" ? "sine" : "square";
    const duration = type === "success" ? 0.15 : 0.4;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext not available (SSR guard)
  }
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ─── Mode-switch command barcodes ────────────────────────────────────────────

const KIOSK_CMD_IN = "__MODE_IN__";
const KIOSK_CMD_OUT = "__MODE_OUT__";

// ─── Component ───────────────────────────────────────────────────────────────

export default function KioskPage() {
  const [mode, setMode] = useState<ScanMode>("in");
  const [kioskState, setKioskState] = useState<KioskState>({ status: "idle" });
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [inputBuffer, setInputBuffer] = useState("");
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    inputRef.current?.focus();
  }, []);

  // Refocus on visibility change (e.g. coming back to tab)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") inputRef.current?.focus();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const pushHistory = useCallback((entry: Omit<ScanEntry, "timestamp">) => {
    setHistory((prev) => [{ ...entry, timestamp: new Date() }, ...prev].slice(0, 5));
  }, []);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (kioskState.status === "processing") return;
      if (!barcode.trim()) return;

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

      // Mode-switch commands — handled locally, no API call
      if (barcode === KIOSK_CMD_IN) {
        setMode("in");
        speak("Stocking in mode");
        inputRef.current?.focus();
        return;
      }
      if (barcode === KIOSK_CMD_OUT) {
        setMode("out");
        speak("Stocking out mode");
        inputRef.current?.focus();
        return;
      }

      setKioskState({ status: "processing", barcode });

      const delta = mode === "in" ? 1 : -1;

      try {
        const res = await fetch("/api/kiosk/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode, delta }),
        });

        const data = await res.json();

        if (!res.ok || data.status === "not_found") {
          setKioskState({ status: "not_found", barcode });
          playTone("fail");
          speak("Item not found");
          pushHistory({ barcode, name: null, mode, newQty: null, result: "not_found" });
        } else {
          const product: KioskProduct = data.product;
          const resultStatus = data.autocreated ? "autocreated" : "found";
          const addedToGroceryLists: string[] = data.addedToGroceryLists ?? [];
          setKioskState({ status: resultStatus as "found" | "autocreated", product, mode, addedToGroceryLists });
          playTone("success");
          const verb = mode === "in" ? "Added to pantry inventory" : "Removed from pantry inventory";
          const grocerySuffix = addedToGroceryLists.length > 0 ? ` Added to grocery list.` : "";
          speak(`${verb} — ${product.name}. Quantity now ${product.quantity}.${grocerySuffix}`);
          pushHistory({ barcode, name: product.name, mode, newQty: product.quantity, result: resultStatus as "found" | "autocreated" });
        }
      } catch {
        setKioskState({ status: "not_found", barcode });
        playTone("fail");
        speak("Scan error");
      }

      resetTimerRef.current = setTimeout(() => {
        setKioskState({ status: "idle" });
        inputRef.current?.focus();
      }, 3500);
    },
    [kioskState.status, mode, pushHistory]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const barcode = inputBuffer.trim();
      setInputBuffer("");
      if (barcode) handleBarcode(barcode);
    }
  }

  // ─── Derived state for panel background ──────────────────────────────────

  const panelBg =
    kioskState.status === "found" || kioskState.status === "autocreated"
      ? "rgba(21, 128, 61, 0.12)"
      : kioskState.status === "not_found"
      ? "rgba(185, 28, 28, 0.12)"
      : "transparent";

  // ─── Center panel content ─────────────────────────────────────────────────

  function renderCenter() {
    if (kioskState.status === "idle") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", textAlign: "center" }}>
          <ScanLine size={120} color="#2d2d2d" />
          <p style={{ color: "#4a4a4a", fontSize: "2.5rem", fontWeight: 600 }}>
            Scan a barcode to begin
          </p>
          <p style={{ color: "#ffffff", fontSize: "1.5rem" }}>
            Mode:{" "}
            <span style={{ color: mode === "in" ? "#15803d" : "#b91c1c", fontWeight: 700 }}>
              {mode === "in" ? "STOCKING IN" : "STOCKING OUT"}
            </span>
          </p>

          {/* Mode-switch QR codes */}
          {mounted && (
            <div style={{ display: "flex", gap: "8rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "0.875rem", background: "#ffffff", borderRadius: "0.75rem",
                  border: `3px solid ${mode === "in" ? "#15803d" : "#2d2d2d"}` }}>
                  <QRCodeSVG value={KIOSK_CMD_IN} size={110} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <span style={{ color: mode === "in" ? "#15803d" : "#ffffff", fontSize: "0.9rem", fontWeight: 700 }}>
                  Scan → IN mode
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "0.875rem", background: "#ffffff", borderRadius: "0.75rem",
                  border: `3px solid ${mode === "out" ? "#b91c1c" : "#2d2d2d"}` }}>
                  <QRCodeSVG value={KIOSK_CMD_OUT} size={110} bgColor="#ffffff" fgColor="#000000" />
                </div>
                <span style={{ color: mode === "out" ? "#b91c1c" : "#ffffff", fontSize: "0.9rem", fontWeight: 700 }}>
                  Scan → OUT mode
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (kioskState.status === "processing") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", textAlign: "center" }}>
          <Loader2 size={80} color="#ff9900" style={{ animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#e5e5e5", fontSize: "1.75rem" }}>
            Looking up{" "}
            <span style={{ color: "#ff9900", fontFamily: "monospace" }}>{kioskState.barcode}</span>
            ...
          </p>
        </div>
      );
    }

    if (kioskState.status === "found" || kioskState.status === "autocreated") {
      const { product, mode: scanMode, addedToGroceryLists } = kioskState;
      const statusText =
        kioskState.status === "autocreated"
          ? "New item added to pantry inventory"
          : scanMode === "in"
          ? "Added to pantry inventory"
          : "Removed from pantry inventory";

      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center", maxWidth: "700px" }}>
          {/* Success icon */}
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#15803d",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 32px rgba(21,128,61,0.5)" }}>
            <Check size={56} color="#ffffff" strokeWidth={3} />
          </div>

          {/* Status text */}
          <p style={{ color: "#86efac", fontSize: "1.75rem", fontWeight: 600 }}>{statusText}</p>

          {/* Auto-created badge */}
          {kioskState.status === "autocreated" && (
            <div style={{ background: "#1d4ed8", color: "#ffffff", borderRadius: "9999px",
              padding: "0.4rem 1.25rem", fontSize: "1rem", fontWeight: 600 }}>
              Automatically created from product database
            </div>
          )}

          {/* Added to grocery list badge */}
          {addedToGroceryLists.length > 0 && (
            <div style={{ background: "#6d28d9", color: "#ffffff", borderRadius: "9999px",
              padding: "0.4rem 1.25rem", fontSize: "1rem", fontWeight: 600 }}>
              🛒 Added to grocery list{addedToGroceryLists.length > 1 ? "s" : ""}: {addedToGroceryLists.join(", ")}
            </div>
          )}

          {/* Product photo */}
          {product.photoUrl ? (
            <img
              src={product.photoUrl}
              alt={product.name}
              style={{ width: 120, height: 120, objectFit: "contain", borderRadius: "0.75rem",
                background: "#1a1a1a", padding: "0.5rem" }}
            />
          ) : (
            <div style={{ width: 120, height: 120, background: "#1a1a1a", borderRadius: "0.75rem",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={56} color="#3a3a3a" />
            </div>
          )}

          {/* Product name */}
          <p style={{ color: "#ff9900", fontSize: "3rem", fontWeight: 700, lineHeight: 1.1 }}>
            {product.name}
          </p>

          {/* Brand / size */}
          {(product.brand || product.size) && (
            <p style={{ color: "#9ca3af", fontSize: "1.5rem" }}>
              {[product.brand, product.size].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Qty pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.25rem" }}>
            <span style={{ color: "#6b7280", fontSize: "1.25rem" }}>Quantity now:</span>
            <span style={{ background: "#ff9900", color: "#0a0a0a", borderRadius: "9999px",
              padding: "0.5rem 1.75rem", fontSize: "2.25rem", fontWeight: 700 }}>
              {product.quantity}
            </span>
          </div>
        </div>
      );
    }

    if (kioskState.status === "not_found") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
          {/* Fail icon */}
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#b91c1c",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 32px rgba(185,28,28,0.5)" }}>
            <X size={56} color="#ffffff" strokeWidth={3} />
          </div>

          <p style={{ color: "#fca5a5", fontSize: "1.75rem", fontWeight: 600 }}>
            Not found in pantry or product databases
          </p>

          <p style={{ color: "#e5e5e5", fontSize: "2.5rem", fontWeight: 700 }}>
            Item Not Found
          </p>

          <p style={{ color: "#9ca3af", fontSize: "1.25rem" }}>
            Barcode:{" "}
            <span style={{ color: "#e5e5e5", fontFamily: "monospace" }}>{kioskState.barcode}</span>
          </p>

          {/* QR code to pantry page */}
          {mounted && (
            <div style={{ marginTop: "0.75rem", padding: "1.25rem 1.5rem", background: "#ffffff",
              borderRadius: "0.75rem", display: "inline-flex", flexDirection: "column",
              alignItems: "center", gap: "0.75rem" }}>
              <QRCodeSVG
                value={`${window.location.origin}/pantry`}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <p style={{ color: "#111827", fontSize: "0.875rem", fontWeight: 600 }}>
                Scan to add manually in Pantry
              </p>
            </div>
          )}
        </div>
      );
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Root — escapes Shell flex layout */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column",
          background: "#0a0a0a", fontFamily: "Poppins, sans-serif", color: "#e5e5e5" }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.5rem 3rem", borderBottom: "1px solid #2d2d2d", flexShrink: 0 }}>
          <span style={{ color: "#ff9900", fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            HomeStack Pantry
          </span>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMode("in"); inputRef.current?.focus(); }}
              style={{ background: mode === "in" ? "#15803d" : "#1a1a1a",
                color: "#ffffff", border: `2px solid ${mode === "in" ? "#15803d" : "#3a3a3a"}`,
                borderRadius: "0.5rem", padding: "0.875rem 3rem",
                fontSize: "1.5rem", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: mode === "in" ? "0 0 20px rgba(21,128,61,0.4)" : "none" }}
            >
              IN
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMode("out"); inputRef.current?.focus(); }}
              style={{ background: mode === "out" ? "#b91c1c" : "#1a1a1a",
                color: "#ffffff", border: `2px solid ${mode === "out" ? "#b91c1c" : "#3a3a3a"}`,
                borderRadius: "0.5rem", padding: "0.875rem 3rem",
                fontSize: "1.5rem", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: mode === "out" ? "0 0 20px rgba(185,28,28,0.4)" : "none" }}
            >
              OUT
            </button>
          </div>
        </div>

        {/* ── Center panel ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: panelBg, transition: "background-color 0.3s", padding: "2rem" }}>
          {renderCenter()}
        </div>

        {/* ── Bottom bar — recent scans ── */}
        <div style={{ borderTop: "1px solid #2d2d2d", padding: "1rem 3rem",
          display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0, minHeight: "80px",
          overflowX: "auto" }}>
          <span style={{ color: "#4a4a4a", fontSize: "0.8rem", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", flexShrink: 0 }}>
            Recent
          </span>

          {history.length === 0 && (
            <span style={{ color: "#3a3a3a", fontSize: "0.875rem" }}>No scans yet</span>
          )}

          {history.map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 1rem", flexShrink: 0,
              background: entry.result === "not_found" ? "#1a0808" : "#081a08",
              borderRadius: "0.5rem",
              border: `1px solid ${entry.result === "not_found" ? "#3b0f0f" : "#0f3b0f"}` }}>
              <span style={{ background: entry.mode === "in" ? "#15803d" : "#b91c1c",
                color: "#ffffff", borderRadius: "9999px", padding: "0.15rem 0.6rem",
                fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                {entry.mode}
              </span>
              <span style={{ color: entry.result === "not_found" ? "#9ca3af" : "#e5e5e5",
                fontSize: "0.875rem", maxWidth: "200px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.name ?? entry.barcode}
              </span>
              {entry.newQty !== null && (
                <span style={{ color: "#ff9900", fontSize: "0.875rem", fontWeight: 700 }}>
                  → {entry.newQty}
                </span>
              )}
              <span style={{ color: "#4a4a4a", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                {entry.timestamp.toLocaleTimeString([], {
                  hour: "2-digit", minute: "2-digit", second: "2-digit"
                })}
              </span>
            </div>
          ))}
        </div>

        {/* ── Hidden barcode input — always focused ── */}
        <input
          ref={inputRef}
          type="text"
          className="sr-only"
          autoFocus
          autoComplete="off"
          value={inputBuffer}
          onChange={(e) => setInputBuffer(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Barcode scanner input"
        />
      </div>
    </>
  );
}
