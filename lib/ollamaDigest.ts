export async function generateSenderDescription(senderName: string): Promise<string | null> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llava";

  const prompt = `In one sentence (15 words or fewer), describe what types of emails "${senderName}" typically sends. Be practical and specific. Output only the sentence, no quotes.`;

  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data.response?.trim() ?? "";
    return text || null;
  } catch {
    return null;
  }
}
