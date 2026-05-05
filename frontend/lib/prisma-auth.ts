import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
  var __prismaAuth: PrismaClient | undefined;
}

function createAuthPrismaClient() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 環境変数が設定されていません");
  }
  const pool = new pg.Pool({
    connectionString: url,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prismaAuth = globalThis.__prismaAuth ?? createAuthPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaAuth = prismaAuth;
}
