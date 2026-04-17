import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildClient() {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("connection_limit", "3");
  url.searchParams.set("pool_timeout", "30");
  return new PrismaClient({ datasources: { db: { url: url.toString() } } });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

globalForPrisma.prisma = prisma;
