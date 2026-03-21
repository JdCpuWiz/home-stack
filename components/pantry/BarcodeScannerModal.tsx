"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    activeRef.current = true;

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        if (!videoRef.current || !activeRef.current) return;
        setLoading(false);

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!activeRef.current) return;
            if (result) {
              activeRef.current = false;
              controls?.stop();
              onDetected(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      } catch {
        if (activeRef.current) {
          setLoading(false);
          setError("Camera access denied or not available.");
        }
      }
    }

    startScanner();

    return () => {
      activeRef.current = false;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-100)" }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--bg-300)" }}
        >
          <span className="font-semibold">Scan Barcode</span>
          <button onClick={onClose} className="btn-secondary btn-sm p-1.5">
            <X size={16} />
          </button>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm" style={{ color: "#f87171" }}>
            {error}
          </div>
        ) : (
          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            {loading && (
              <div
                className="absolute inset-0 flex items-center justify-center text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Starting camera…
              </div>
            )}
            <video ref={videoRef} className="w-full h-full object-cover" />
            {/* Targeting guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-2 rounded-lg"
                style={{
                  width: "70%",
                  height: "35%",
                  borderColor: "rgba(255,153,0,0.8)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                }}
              />
            </div>
          </div>
        )}

        <div className="p-3 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
          Point camera at barcode — auto-detects
        </div>
      </div>
    </div>
  );
}
