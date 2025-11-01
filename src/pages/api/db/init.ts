import type { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";
import path from "path";
import fs from "fs";

// This endpoint uses pg.Pool directly for raw SQL execution
// Prisma doesn't support raw SQL schema creation
const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace(/^["']|["']$/g, ""),
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await pool.connect();
    try {
      // Read and execute schema SQL
      const schemaPath = path.join(process.cwd(), "src/lib/schema.sql");
      const schemaSQL = fs.readFileSync(schemaPath, "utf8");

      await client.query(schemaSQL);

      return res
        .status(200)
        .json({ message: "Database initialized successfully" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    return res.status(500).json({
      error: "Failed to initialize database",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
