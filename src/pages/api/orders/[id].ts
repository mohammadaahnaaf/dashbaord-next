import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

// Helper function to check product variant quantity availability
async function validateItemQuantity(
  productId: number,
  color: string | null | undefined,
  size: string | null | undefined,
  requestedQty: number
): Promise<{ available: boolean; availableQty: number; error?: string }> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variantGroups: true },
    });

    if (!product) {
      return { available: false, availableQty: 0, error: "Product not found" };
    }

    // If no color or size specified, we can't validate (legacy products)
    if (!color || !size) {
      return { available: true, availableQty: 9999 }; // Allow legacy products
    }

    // Find the variant group that matches the color
    const variantGroup = product.variantGroups.find(
      (vg) => vg.color.toLowerCase() === color.toLowerCase()
    );

    if (!variantGroup) {
      return {
        available: false,
        availableQty: 0,
        error: `Color '${color}' not found for product`,
      };
    }

    // Check if size exists in the variant group
    if (!variantGroup.sizes.includes(size)) {
      return {
        available: false,
        availableQty: 0,
        error: `Size '${size}' not available for color '${color}'`,
      };
    }

    // Get the available quantity for this size
    const quantities =
      (variantGroup?.quantities as unknown as Record<string, number>) || {};
    const availableQty = quantities?.[size] || 0;

    if (requestedQty > availableQty) {
      return {
        available: false,
        availableQty,
        error: `Only ${availableQty} items available for ${product.name} (${color}, ${size})`,
      };
    }

    return { available: true, availableQty };
  } catch (error) {
    console.error("Error validating quantity:", error);
    return {
      available: false,
      availableQty: 0,
      error: "Error checking availability",
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    switch (req.method) {
      case "GET":
        return await getOrder(req, res, parseInt(id));
      case "PUT":
      case "PATCH":
        return await updateOrder(req, res, parseInt(id));
      case "DELETE":
        return await deleteOrder(req, res, parseInt(id));
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

async function getOrder(req: NextApiRequest, res: NextApiResponse, id: number) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({
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
      estimated_delivery_date: order.estimatedDeliveryDate || null,
      total_amount: parseFloat(order.totalAmount.toString()),
      total_items: order.totalItems,
      delivery_charge: parseFloat(order.deliveryChargeBdt.toString()),
      delivery_address: order.address,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    });
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(500).json({
      error: "Failed to fetch order",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function updateOrder(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  const {
    status,
    address,
    delivery_charge_bdt,
    advance_bdt,
    estimated_delivery_date,
    pathao_city_name,
    pathao_zone_name,
    pathao_area_name,
    pathao_tracking_code,
    pathao_status,
    last_synced_at,
    items,
  } = req.body;

  try {
    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Validate quantity availability if items are being updated
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const validation = await validateItemQuantity(
          item.product_id,
          item.color_snapshot,
          item.size_snapshot,
          item.qty || item.quantity || 0
        );

        if (!validation.available) {
          return res.status(400).json({
            error: validation.error || "Insufficient quantity",
            product_id: item.product_id,
            available_quantity: validation.availableQty,
          });
        }
      }
    }

    // Use transaction for updates
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = parseFloat(existingOrder.totalAmount.toString());
      let totalItems = existingOrder.totalItems;
      let deliveryCharge = parseFloat(
        existingOrder.deliveryChargeBdt.toString()
      );
      let advance = parseFloat(existingOrder.advanceBdt.toString());

      // Recalculate if items are being updated
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // Create new items
        await tx.orderItem.createMany({
          data: items.map(
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
              orderId: id,
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
        });

        // Recalculate totals
        const itemsSubtotal = items.reduce(
          (
            sum: number,
            item: {
              sell_price_bdt_snapshot: number;
              qty: number;
              quantity?: number;
            }
          ) =>
            sum +
            parseFloat(item.sell_price_bdt_snapshot.toString()) *
              (item.qty || item.quantity || 0),
          0
        );
        deliveryCharge =
          delivery_charge_bdt !== undefined
            ? parseFloat(delivery_charge_bdt.toString())
            : deliveryCharge;
        totalAmount = itemsSubtotal + deliveryCharge;
        totalItems = items.reduce(
          (sum: number, item: { qty?: number; quantity?: number }) =>
            sum + (item.qty || item.quantity || 0),
          0
        );
      } else {
        // Update delivery charge if provided
        if (delivery_charge_bdt !== undefined) {
          deliveryCharge = parseFloat(delivery_charge_bdt.toString());
          totalAmount =
            parseFloat(existingOrder.totalAmount.toString()) -
            parseFloat(existingOrder.deliveryChargeBdt.toString()) +
            deliveryCharge;
        }
      }

      // Update advance if provided
      if (advance_bdt !== undefined) {
        advance = parseFloat(advance_bdt.toString());
      }

      const dueBdt = totalAmount - advance;

      // Update order
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(address !== undefined && { address: address.trim() }),
          deliveryChargeBdt: deliveryCharge,
          advanceBdt: advance,
          dueBdt: dueBdt,
          ...(estimated_delivery_date !== undefined && {
            estimatedDeliveryDate: estimated_delivery_date
              ? new Date(estimated_delivery_date)
              : null,
          }),
          ...(pathao_city_name !== undefined && {
            pathaoCityName: pathao_city_name?.trim() || null,
          }),
          ...(pathao_zone_name !== undefined && {
            pathaoZoneName: pathao_zone_name?.trim() || null,
          }),
          ...(pathao_area_name !== undefined && {
            pathaoAreaName: pathao_area_name?.trim() || null,
          }),
          ...(pathao_tracking_code !== undefined && {
            pathaoTrackingCode: pathao_tracking_code?.trim() || null,
          }),
          ...(pathao_status !== undefined && {
            pathaoStatus: pathao_status?.trim() || null,
          }),
          ...(last_synced_at !== undefined && {
            lastSyncedAt: last_synced_at ? new Date(last_synced_at) : null,
          }),
          totalAmount: totalAmount,
          totalItems: totalItems,
        },
        include: {
          customer: true,
          orderItems: true,
        },
      });

      return updatedOrder;
    });

    return res.status(200).json({
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
      estimated_delivery_date: result.estimatedDeliveryDate || null,
      total_amount: parseFloat(result.totalAmount.toString()),
      total_items: result.totalItems,
      delivery_charge: parseFloat(result.deliveryChargeBdt.toString()),
      delivery_address: result.address,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    });
  } catch (error) {
    console.error("Update order error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(500).json({
      error: "Failed to update order",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function deleteOrder(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  try {
    await prisma.order.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(500).json({
      error: "Failed to delete order",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
