"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, ScanText, Upload } from "lucide-react";
import type { FullRecipe } from "./RecipeDetail";

type Ingredient = { quantity: string; unit: string; name: string };
type Step = { instruction: string };

type ScannedRecipe = {
  title?: string;
  servings?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  tags?: string[];
  ingredients?: { quantity?: string | null; unit?: string | null; name: string; position: number }[];
  steps?: { stepNumber: number; instruction: string }[];
};

function emptyIngredient(): Ingredient {
  return { quantity: "", unit: "", name: "" };
}
function emptyStep(): Step {
  return { instruction: "" };
}

type Props = { recipe?: FullRecipe };

export default function RecipeForm({ recipe }: Props) {
  const router = useRouter();
  const isEdit = !!recipe;

  // Core fields
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [servings, setServings] = useState(recipe?.servings ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? "");
  const [tagsInput, setTagsInput] = useState(recipe?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");

  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients.length
      ? recipe.ingredients.map((i) => ({ quantity: i.quantity ?? "", unit: i.unit ?? "", name: i.name }))
      : [emptyIngredient()]
  );

  // Steps
  const [steps, setSteps] = useState<Step[]>(
    recipe?.steps.length
      ? recipe.steps.map((s) => ({ instruction: s.instruction }))
      : [emptyStep()]
  );

  // Scan UI
  const [scanTab, setScanTab] = useState<"text" | "image">("text");
  const [scanText, setScanText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Ingredients helpers ──────────────────────────────────────────
  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  }
  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }
  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Steps helpers ────────────────────────────────────────────────
  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => i === index ? { instruction: value } : s));
  }
  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }
  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Populate form from scanned data ─────────────────────────────
  const populateFromScanned = useCallback((data: ScannedRecipe) => {
    if (data.title) setTitle(data.title);
    if (data.servings) setServings(data.servings);
    if (data.sourceUrl) setSourceUrl(data.sourceUrl);
    if (data.notes) setNotes(data.notes);
    if (data.tags?.length) setTagsInput(data.tags.join(", "));
    if (data.ingredients?.length) {
      setIngredients(
        data.ingredients.map((i) => ({
          quantity: i.quantity ?? "",
          unit: i.unit ?? "",
          name: i.name ?? "",
        }))
      );
    }
    if (data.steps?.length) {
      const sorted = [...data.steps].sort((a, b) => a.stepNumber - b.stepNumber);
      setSteps(sorted.map((s) => ({ instruction: s.instruction })));
    }
  }, []);

  // ── Scan: text ───────────────────────────────────────────────────
  async function handleScanText() {
    if (!scanText.trim()) return;
    setScanError("");
    setScanning(true);
    try {
      const res = await fetch("/api/recipes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", content: scanText }),
      });
      const data = await res.json() as ScannedRecipe & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      populateFromScanned(data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  // ── Scan: image ──────────────────────────────────────────────────
  async function handleScanImage(file: File) {
    setScanError("");
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/recipes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", base64 }),
      });
      const data = await res.json() as ScannedRecipe & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      populateFromScanned(data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setSaveError("Title is required"); return; }
    setSaveError("");
    setSaving(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      servings: servings.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      notes: notes.trim() || null,
      tags,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i, idx) => ({ quantity: i.quantity.trim() || null, unit: i.unit.trim() || null, name: i.name.trim(), position: idx })),
      steps: steps
        .filter((s) => s.instruction.trim())
        .map((s, idx) => ({ stepNumber: idx + 1, instruction: s.instruction.trim() })),
    };

    try {
      const url = isEdit ? `/api/recipes/${recipe!.id}` : "/api/recipes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { id?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/recipes/${data.id ?? recipe!.id}`);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        {isEdit ? "Edit Recipe" : "New Recipe"}
      </h1>

      {/* ── Scan Section (create only) ── */}
      {!isEdit && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
            Auto-fill with Ollama
          </h2>
          {/* Tab toggle */}
          <div className="flex gap-1 mb-3">
            {(["text", "image"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setScanTab(tab)}
                className="btn-sm px-3"
                style={{
                  background: scanTab === tab ? "var(--accent-orange)" : "var(--bg-300)",
                  color: scanTab === tab ? "#000" : "var(--text-secondary)",
                  borderRadius: "6px",
                }}
              >
                {tab === "text" ? "Paste Text" : "Upload Image"}
              </button>
            ))}
          </div>

          {scanTab === "text" ? (
            <div className="flex flex-col gap-2">
              <textarea
                className="input text-sm"
                rows={6}
                placeholder="Paste raw recipe text here…"
                value={scanText}
                onChange={(e) => setScanText(e.target.value)}
              />
              <button
                onClick={handleScanText}
                disabled={scanning || !scanText.trim()}
                className="btn-secondary btn-sm self-start flex items-center gap-1.5"
              >
                {scanning ? <Loader2 size={14} className="animate-spin" /> : <ScanText size={14} />}
                {scanning ? "Scanning…" : "Scan with Ollama"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScanImage(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="btn-secondary btn-sm self-start flex items-center gap-1.5"
              >
                {scanning ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {scanning ? "Scanning…" : "Choose Image"}
              </button>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Upload a photo of a printed recipe — Ollama vision will parse it.
              </p>
            </div>
          )}
          {scanError && (
            <p className="text-sm mt-2" style={{ color: "#ef4444" }}>{scanError}</p>
          )}
        </div>
      )}

      {/* ── Title ── */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
          Title <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          className="input w-full"
          placeholder="Recipe title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* ── Servings + Source ── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Servings</label>
          <input className="input w-full" placeholder="e.g. 4 servings" value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Source URL</label>
          <input className="input w-full" placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </div>
      </div>

      {/* ── Tags ── */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Tags</label>
        <input
          className="input w-full"
          placeholder="e.g. dinner, chicken, quick"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
        {tagsInput.trim() && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tagsInput.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--bg-300)", color: "var(--accent-orange)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Ingredients ── */}
      <div className="mb-4">
        <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-primary)" }}>
          Ingredients
        </label>
        <div className="flex gap-2 items-center mb-1">
          <span className="w-20 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Qty</span>
          <span className="w-20 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Unit</span>
          <span className="flex-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Ingredient</span>
          <span className="shrink-0 w-7" />
        </div>
        <div className="flex flex-col gap-2">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                className="input w-20 text-sm"
                placeholder="Qty"
                value={ing.quantity}
                onChange={(e) => updateIngredient(idx, "quantity", e.target.value)}
              />
              <input
                className="input w-20 text-sm"
                placeholder="Unit"
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
              />
              <input
                className="input flex-1 text-sm"
                placeholder="Ingredient name"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, "name", e.target.value)}
              />
              <button
                onClick={() => removeIngredient(idx)}
                className="btn-danger btn-sm p-1.5 shrink-0"
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addIngredient} className="btn-secondary btn-sm flex items-center gap-1.5 mt-2">
          <Plus size={13} />
          Add Ingredient
        </button>
      </div>

      {/* ── Steps ── */}
      <div className="mb-4">
        <label className="block text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-primary)" }}>
          Instructions
        </label>
        <div className="flex flex-col gap-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-2"
                style={{ backgroundColor: "var(--accent-orange)", color: "#000" }}
              >
                {idx + 1}
              </span>
              <textarea
                className="input flex-1 text-sm"
                rows={2}
                placeholder={`Step ${idx + 1} instructions…`}
                value={step.instruction}
                onChange={(e) => updateStep(idx, e.target.value)}
              />
              <button
                onClick={() => removeStep(idx)}
                className="btn-danger btn-sm p-1.5 shrink-0 mt-1"
                title="Remove step"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addStep} className="btn-secondary btn-sm flex items-center gap-1.5 mt-2">
          <Plus size={13} />
          Add Step
        </button>
      </div>

      {/* ── Notes ── */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Notes</label>
        <textarea
          className="input w-full text-sm"
          rows={3}
          placeholder="Additional notes, tips, variations…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* ── Save ── */}
      {saveError && <p className="text-sm mb-3" style={{ color: "#ef4444" }}>{saveError}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-1.5"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Recipe"}
        </button>
        <button
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
