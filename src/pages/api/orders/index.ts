import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET":
        return await getOrders(req, res);
      case "POST":
        return await createOrder(req, res);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Order API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function getOrders(req: NextApiRequest, res: NextApiResponse) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        orderItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      customer_id: order.customerId,
      customer_name: order.customer.name,
      customer_phone: order.customer.phone,
      customer_address: order.customer.address || "",
      customer_city: order.customer.city || "",
      customer_zone: order.customer.zone || "",
      customer_area: order.customer.area || "",
      customer_postal_code: order.customer.postalCode || "",
      customer_country: order.customer.country || "",
      customer_email: order.customer.email || "",
      customer_website: order.customer.website || "",
      items: order.orderItems.map((item) => ({
        id: item.id,
        product_id: item.productId,
        product_name_snapshot: item.productNameSnapshot,
        image_url_snapshot: item.imageUrlSnapshot || null,
        color_snapshot: item.colorSnapshot || null,
        size_snapshot: item.sizeSnapshot || null,
        qty: item.qty,
        sell_price_bdt_snapshot: parseFloat(
          item.sellPriceBdtSnapshot.toString()
        ),
        price: parseFloat(item.price.toString()),
        quantity: item.quantity,
      })),
      status: order.status,
      address: order.address,
      delivery_charge_bdt: parseFloat(order.deliveryChargeBdt.toString()),
      advance_bdt: parseFloat(order.advanceBdt.toString()),
      due_bdt: parseFloat(order.dueBdt.toString()),
      pathao_city_name: order.pathaoCityName || null,
      pathao_zone_name: order.pathaoZoneName || null,
      pathao_area_name: order.pathaoAreaName || null,
      pathao_tracking_code: order.pathaoTrackingCode || null,
      pathao_status: order.pathaoStatus || null,
      last_synced_at: order.lastSyncedAt || null,
      total_amount: parseFloat(order.totalAmount.toString()),
      total_items: order.totalItems,
      delivery_charge: parseFloat(order.deliveryChargeBdt.toString()),
      delivery_address: order.address,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    }));

    return res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      error: "Failed to fetch orders",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function createOrder(req: NextApiRequest, res: NextApiResponse) {
  const {
    customer_id,
    items,
    status = "pending",
    address,
    delivery_charge_bdt = 0,
    advance_bdt = 0,
    pathao_city_name,
    pathao_zone_name,
    pathao_area_name,
    pathao_tracking_code,
    pathao_status,
  } = req.body;

  // Validation
  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order items are required" });
  }

  if (!address || !address.trim()) {
    return res.status(400).json({ error: "Delivery address is required" });
  }

  // Validate items
  for (const item of items) {
    if (!item.product_id || !item.product_name_snapshot || !item.qty) {
      return res.status(400).json({
        error: "Each item must have product_id, product_name_snapshot, and qty",
      });
    }
  }

  try {
    // Calculate totals
    const itemsSubtotal = items.reduce(
      (sum, item) =>
        sum +
        parseFloat(item.sell_price_bdt_snapshot || item.price || 0) *
          (item.qty || item.quantity || 0),
      0
    );
    const deliveryCharge = parseFloat(delivery_charge_bdt || 0);
    const totalAmount = itemsSubtotal + deliveryCharge;
    const totalItems = items.reduce(
      (sum, item) => sum + (item.qty || item.quantity || 0),
      0
    );
    const advance = parseFloat(advance_bdt || 0);
    const dueBdt = totalAmount - advance;

    // Use Prisma transaction to create order with items and update customer
    const result = await prisma.$transaction(async (tx) => {
      // Create order with items
      const order = await tx.order.create({
        data: {
          customerId: customer_id,
          status: status,
          address: address.trim(),
          deliveryChargeBdt: deliveryCharge,
          advanceBdt: advance,
          dueBdt: dueBdt,
          pathaoCityName: pathao_city_name?.trim() || null,
          pathaoZoneName: pathao_zone_name?.trim() || null,
          pathaoAreaName: pathao_area_name?.trim() || null,
          pathaoTrackingCode: pathao_tracking_code?.trim() || null,
          pathaoStatus: pathao_status?.trim() || null,
          totalAmount: totalAmount,
          totalItems: totalItems,
          orderItems: {
            create: items.map(
              (item: {
                product_id: number;
                product_name_snapshot: string;
                image_url_snapshot?: string | null;
                color_snapshot?: string | null;
                size_snapshot?: string | null;
                qty: number;
                sell_price_bdt_snapshot: number;
                price?: number;
                quantity?: number;
              }) => ({
                productId: item.product_id,
                productNameSnapshot: item.product_name_snapshot.trim(),
                imageUrlSnapshot: item.image_url_snapshot?.trim() || null,
                colorSnapshot: item.color_snapshot?.trim() || null,
                sizeSnapshot: item.size_snapshot?.trim() || null,
                qty: item.qty || item.quantity || 0,
                sellPriceBdtSnapshot: parseFloat(
                  item.sell_price_bdt_snapshot.toString()
                ),
                price: parseFloat(
                  (item.price || item.sell_price_bdt_snapshot).toString()
                ),
                quantity: item.quantity || item.qty || 0,
              })
            ),
          },
        },
        include: {
          customer: true,
          orderItems: true,
        },
      });

      // Update customer total_orders
      await tx.customer.update({
        where: { id: customer_id },
        data: {
          totalOrders: {
            increment: 1,
          },
        },
      });

      return order;
    });

    // Format response
    return res.status(201).json({
      id: result.id,
      customer_id: result.customerId,
      customer_name: result.customer.name,
      customer_phone: result.customer.phone,
      customer_address: result.customer.address || "",
      customer_city: result.customer.city || "",
      customer_zone: result.customer.zone || "",
      customer_area: result.customer.area || "",
      customer_postal_code: result.customer.postalCode || "",
      customer_country: result.customer.country || "",
      customer_email: result.customer.email || "",
      customer_website: result.customer.website || "",
      items: result.orderItems.map((item) => ({
        id: item.id,
        product_id: item.productId,
        product_name_snapshot: item.productNameSnapshot,
        image_url_snapshot: item.imageUrlSnapshot || null,
        color_snapshot: item.colorSnapshot || null,
        size_snapshot: item.sizeSnapshot || null,
        qty: item.qty,
        sell_price_bdt_snapshot: parseFloat(
          item.sellPriceBdtSnapshot.toString()
        ),
        price: parseFloat(item.price.toString()),
        quantity: item.quantity,
      })),
      status: result.status,
      address: result.address,
      delivery_charge_bdt: parseFloat(result.deliveryChargeBdt.toString()),
      advance_bdt: parseFloat(result.advanceBdt.toString()),
      due_bdt: parseFloat(result.dueBdt.toString()),
      pathao_city_name: result.pathaoCityName || null,
      pathao_zone_name: result.pathaoZoneName || null,
      pathao_area_name: result.pathaoAreaName || null,
      pathao_tracking_code: result.pathaoTrackingCode || null,
      pathao_status: result.pathaoStatus || null,
      last_synced_at: result.lastSyncedAt || null,
      total_amount: parseFloat(result.totalAmount.toString()),
      total_items: result.totalItems,
      delivery_charge: parseFloat(result.deliveryChargeBdt.toString()),
      delivery_address: result.address,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    });
  } catch (error) {
    console.error("Create order error:", error);
    const prismaError = error as {
      code?: string;
      meta?: { target?: unknown };
      message?: string;
    };

    // Handle Prisma errors
    if (prismaError.code === "P2003") {
      return res.status(400).json({
        error: "Invalid customer or product reference",
        details: prismaError.message,
      });
    }

    if (prismaError.code && prismaError.code.startsWith("P")) {
      return res.status(400).json({
        error: "Database error",
        details: prismaError.meta?.target || prismaError.message,
      });
    }

    return res.status(500).json({
      error: "Failed to create order",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
