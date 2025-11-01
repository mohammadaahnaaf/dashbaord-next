import { PrismaClient } from "@prisma/client";

// Fix DATABASE_URL if it has quotes (common issue with .env files)
// This must be done before PrismaClient is instantiated
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.startsWith('"') || dbUrl.startsWith("'")) {
    // Remove quotes from both ends
    process.env.DATABASE_URL = dbUrl.replace(/^["']|["']$/g, "");
  }
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
