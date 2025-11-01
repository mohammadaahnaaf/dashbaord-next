import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
// import { Customer } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET":
        return await getCustomers(req, res);
      case "POST":
        return await createCustomer(req, res);
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

async function getCustomers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedCustomers = customers.map((customer: any) => ({
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
    }));

    return res.status(200).json(formattedCustomers);
  } catch (error) {
    console.error("Get customers error:", error);
    return res.status(500).json({
      error: "Failed to fetch customers",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function createCustomer(req: NextApiRequest, res: NextApiResponse) {
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

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: "Phone is required" });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        zone: zone?.trim() || null,
        area: area?.trim() || null,
        postalCode: postal_code?.trim() || null,
        country: country?.trim() || null,
        website: website?.trim() || null,
        totalOrders: 0,
      },
    });

    return res.status(201).json({
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
    console.error("Create customer error:", error);
    const prismaError = error as {
      code?: string;
      meta?: { target?: unknown };
      message?: string;
    };

    // Handle Prisma unique constraint violation (duplicate phone)
    if (prismaError.code === "P2002") {
      return res.status(400).json({
        error: "Customer with this phone number already exists",
        details: prismaError.meta?.target,
      });
    }

    return res.status(500).json({
      error: "Failed to create customer",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
