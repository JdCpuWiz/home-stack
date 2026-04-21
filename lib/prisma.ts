import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return new PrismaClient();
  const url = new URL(raw);
  url.searchParams.set("pgbouncer", "true");
  url.searchParams.set("connection_limit", "3");
  url.searchParams.set("pool_timeout", "30");
  return new PrismaClient({ datasources: { db: { url: url.toString() } } });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

globalForPrisma.prisma = prisma;
