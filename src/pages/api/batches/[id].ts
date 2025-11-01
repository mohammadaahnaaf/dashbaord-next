import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Batch ID is required" });
  }

  try {
    switch (req.method) {
      case "GET":
        return await getBatch(req, res, parseInt(id));
      case "PUT":
        return await updateBatch(req, res, parseInt(id));
      case "DELETE":
        return await deleteBatch(req, res, parseInt(id));
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

async function getBatch(req: NextApiRequest, res: NextApiResponse, id: number) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        batchOrders: {
          select: {
            orderId: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    return res.status(200).json({
      id: batch.id,
      note: batch.note || "",
      created_at: batch.createdAt,
      created_by: batch.createdBy,
      order_ids: batch.batchOrders.map((bo) => bo.orderId),
    });
  } catch (error) {
    console.error("Get batch error:", error);
    return res.status(500).json({
      error: "Failed to fetch batch",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function updateBatch(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  const { note, order_ids } = req.body;

  try {
    // Check if batch exists
    const existingBatch = await prisma.batch.findUnique({
      where: { id },
    });

    if (!existingBatch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Use transaction to update batch and order relations
    const result = await prisma.$transaction(async (tx) => {
      // Update batch note
      await tx.batch.update({
        where: { id },
        data: {
          note: note !== undefined ? note?.trim() || null : undefined,
        },
      });

      // Update batch orders
      await tx.batchOrder.deleteMany({
        where: { batchId: id },
      });

      if (order_ids && Array.isArray(order_ids) && order_ids.length > 0) {
        await tx.batchOrder.createMany({
          data: order_ids.map((orderId: number) => ({
            batchId: id,
            orderId: orderId,
          })),
        });
      }

      // Fetch updated batch
      return await tx.batch.findUnique({
        where: { id },
        include: {
          batchOrders: {
            select: {
              orderId: true,
            },
          },
        },
      });
    });

    return res.status(200).json({
      id: result!.id,
      note: result!.note || "",
      created_at: result!.createdAt,
      created_by: result!.createdBy,
      order_ids: result!.batchOrders.map((bo) => bo.orderId),
    });
  } catch (error) {
    console.error("Update batch error:", error);
    const prismaError = error as {
      code?: string;
      meta?: { target?: unknown };
      message?: string;
    };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Batch not found" });
    }

    if (prismaError.code === "P2003") {
      return res.status(400).json({
        error: "Invalid order reference",
        details: prismaError.message,
      });
    }

    return res.status(500).json({
      error: "Failed to update batch",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function deleteBatch(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  try {
    await prisma.batch.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Batch deleted successfully" });
  } catch (error) {
    console.error("Delete batch error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Batch not found" });
    }

    return res.status(500).json({
      error: "Failed to delete batch",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
