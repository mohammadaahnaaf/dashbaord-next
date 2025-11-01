import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  try {
    switch (req.method) {
      case "GET":
        return await getCustomer(req, res, parseInt(id));
      case "PUT":
        return await updateCustomer(req, res, parseInt(id));
      case "DELETE":
        return await deleteCustomer(req, res, parseInt(id));
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Customer API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function getCustomer(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.status(200).json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      zone: customer.zone || "",
      area: customer.area || "",
      postal_code: customer.postalCode || "",
      country: customer.country || "",
      website: customer.website || "",
      total_orders: customer.totalOrders,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    return res.status(500).json({
      error: "Failed to fetch customer",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function updateCustomer(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  const {
    name,
    phone,
    email,
    address,
    city,
    zone,
    area,
    postal_code,
    country,
    website,
  } = req.body;

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(zone !== undefined && { zone: zone?.trim() || null }),
        ...(area !== undefined && { area: area?.trim() || null }),
        ...(postal_code !== undefined && {
          postalCode: postal_code?.trim() || null,
        }),
        ...(country !== undefined && { country: country?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
      },
    });

    return res.status(200).json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      zone: customer.zone || "",
      area: customer.area || "",
      postal_code: customer.postalCode || "",
      country: customer.country || "",
      website: customer.website || "",
      total_orders: customer.totalOrders,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (prismaError.code === "P2002") {
      return res.status(400).json({
        error: "Customer with this phone number already exists",
        details: prismaError.message,
      });
    }

    return res.status(500).json({
      error: "Failed to update customer",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function deleteCustomer(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  try {
    await prisma.customer.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.status(500).json({
      error: "Failed to delete customer",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
