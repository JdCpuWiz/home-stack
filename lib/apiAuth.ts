import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * Accepts either a valid NextAuth session or a Bearer API key
 * (HOMESTACK_API_KEY env var). Used for server-to-server calls from n8n.
 */
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (session) return true;

  const apiKey = process.env.HOMESTACK_API_KEY;
  if (apiKey) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${apiKey}`) return true;
  }

  return false;
}
