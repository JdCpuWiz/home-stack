"use client";

import { useState, useRef } from "react";

type Photo = { id: number; filename: string };

type Props = {
  toteId: number;
  initialPhotos: Photo[];
};

export default function TotePhotoManager({ toteId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    const form = new FormData();
    form.append("photo", file);

    const res = await fetch(`/api/totes/${toteId}/photos`, { method: "POST", body: form });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }

    const photo = await res.json();
    setPhotos((prev) => [...prev, photo]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(photoId: number) {
    if (!confirm("Remove this photo?")) return;
    await fetch(`/api/totes/${toteId}/photos/${photoId}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
        Photos
      </label>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/uploads/totes/${toteId}/${photo.filename}`}
                alt=""
                className="w-full aspect-square object-cover rounded"
                style={{ border: "1px solid var(--bg-300)" }}
              />
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="btn-secondary btn-sm cursor-pointer inline-block">
        {uploading ? "Uploading…" : "+ Add photo"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
    </div>
  );
}
