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
    // Configure connection pool for Neon's pooler
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration
    // Neon's pooler has a connection limit, so we need to be conservative
    // Using pgbouncer mode settings for better connection management
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Gracefully handle disconnections on server shutdown
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
