import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET":
        return await getBatches(req, res);
      case "POST":
        return await createBatch(req, res);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Batch API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function getBatches(req: NextApiRequest, res: NextApiResponse) {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        batchOrders: {
          select: {
            orderId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedBatches = batches.map((batch) => ({
      id: batch.id,
      note: batch.note || "",
      created_at: batch.createdAt,
      created_by: batch.createdBy,
      order_ids: batch.batchOrders.map((bo) => bo.orderId),
    }));

    return res.status(200).json(formattedBatches);
  } catch (error) {
    console.error("Get batches error:", error);
    return res.status(500).json({
      error: "Failed to fetch batches",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function createBatch(req: NextApiRequest, res: NextApiResponse) {
  const { note, created_by, order_ids = [] } = req.body;

  // Validation
  if (!created_by || !created_by.trim()) {
    return res.status(400).json({ error: "Created by is required" });
  }

  try {
    // Use Prisma transaction to create batch with order relations
    const result = await prisma.$transaction(async (tx) => {
      // Create batch
      const batch = await tx.batch.create({
        data: {
          note: note?.trim() || null,
          createdBy: created_by.trim(),
          batchOrders: {
            create: (Array.isArray(order_ids) ? order_ids : []).map(
              (orderId: number) => ({
                orderId: orderId,
              })
            ),
          },
        },
        include: {
          batchOrders: {
            select: {
              orderId: true,
            },
          },
        },
      });

      return batch;
    });

    return res.status(201).json({
      id: result.id,
      note: result.note || "",
      created_at: result.createdAt,
      created_by: result.createdBy,
      order_ids: result.batchOrders.map((bo) => bo.orderId),
    });
  } catch (error) {
    console.error("Create batch error:", error);
    const prismaError = error as {
      code?: string;
      meta?: { target?: unknown };
      message?: string;
    };

    // Handle Prisma foreign key constraint violations
    if (prismaError.code === "P2003") {
      return res.status(400).json({
        error: "Invalid order reference",
        details: prismaError.message,
      });
    }

    return res.status(500).json({
      error: "Failed to create batch",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
