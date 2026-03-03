import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llava";

const RECIPE_PROMPT = `Parse this recipe and return ONLY valid JSON with this exact structure, no markdown fences, no extra text:
{
  "title": "string",
  "servings": "string or null",
  "sourceUrl": null,
  "notes": null,
  "tags": ["string"],
  "ingredients": [{"quantity": "string or null", "unit": "string or null", "name": "string", "position": 0}],
  "steps": [{"stepNumber": 1, "instruction": "string"}]
}
Recipe content:
`;

function extractJson(raw: string): unknown {
  // Strip markdown code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : raw.trim();
  return JSON.parse(candidate);
}

// POST /api/recipes/scan
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { type: "text" | "image"; content?: string; base64?: string };
  const { type, content, base64 } = body;

  if (type === "text" && !content?.trim()) {
    return NextResponse.json({ error: "content is required for text type" }, { status: 400 });
  }
  if (type === "image" && !base64?.trim()) {
    return NextResponse.json({ error: "base64 is required for image type" }, { status: 400 });
  }

  const ollamaBody: Record<string, unknown> = {
    model: OLLAMA_MODEL,
    stream: false,
  };

  if (type === "text") {
    ollamaBody.prompt = RECIPE_PROMPT + content;
  } else {
    // Strip data URL prefix if present
    const imageData = base64!.replace(/^data:[^;]+;base64,/, "");
    ollamaBody.prompt = RECIPE_PROMPT + "[See attached image]";
    ollamaBody.images = [imageData];
  }

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ollamaBody),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error("Ollama fetch error:", err);
    return NextResponse.json({ error: "Failed to reach Ollama" }, { status: 502 });
  }

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text();
    console.error("Ollama error response:", text);
    return NextResponse.json({ error: "Ollama returned an error", detail: text }, { status: 502 });
  }

  const ollamaData = await ollamaRes.json() as { response?: string };
  const raw = ollamaData.response ?? "";

  try {
    const parsed = extractJson(raw);
    return NextResponse.json(parsed);
  } catch {
    console.error("Failed to parse Ollama JSON output:", raw);
    return NextResponse.json(
      { error: "Ollama did not return valid JSON", raw },
      { status: 422 }
    );
  }
}
