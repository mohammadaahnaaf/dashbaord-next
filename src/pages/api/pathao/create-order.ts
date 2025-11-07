import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const {
    store_id,
    merchant_order_id,
    recipient_name,
    recipient_phone,
    recipient_address,
    delivery_type,
    item_type,
    special_instruction,
    item_quantity,
    item_weight,
    item_description,
    amount_to_collect,
  } = req.body;

  // Validate required fields
  if (
    !store_id ||
    !merchant_order_id ||
    !recipient_name ||
    !recipient_phone ||
    !recipient_address ||
    !delivery_type ||
    !item_type ||
    !item_quantity ||
    !item_weight ||
    !item_description ||
    amount_to_collect === undefined
  ) {
    return res.status(400).json({
      error: "Missing required fields",
      required: [
        "store_id",
        "merchant_order_id",
        "recipient_name",
        "recipient_phone",
        "recipient_address",
        "delivery_type",
        "item_type",
        "item_quantity",
        "item_weight",
        "item_description",
        "amount_to_collect",
      ],
    });
  }

  try {
    const pathaoBaseUrl =
      process.env.PATHAO_BASE_URL || "https://api-hermes.pathao.com";

    const response = await fetch(`${pathaoBaseUrl}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        store_id: parseInt(store_id),
        merchant_order_id: String(merchant_order_id),
        recipient_name: recipient_name.trim(),
        recipient_phone: recipient_phone.trim(),
        recipient_address: recipient_address.trim(),
        delivery_type: parseInt(delivery_type),
        item_type: parseInt(item_type),
        special_instruction: special_instruction?.trim() || "",
        item_quantity: parseInt(item_quantity),
        item_weight: String(item_weight),
        item_description: item_description.trim(),
        amount_to_collect: parseFloat(amount_to_collect),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Pathao create order API error:", error);
    return res.status(500).json({
      error: "Failed to create order in Pathao",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

