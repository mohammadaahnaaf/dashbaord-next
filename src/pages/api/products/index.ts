import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

interface VariantGroupInput {
  color?: string;
  sizes?: string[];
  sell_price_override?: number;
  image_url?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case "GET":
        return await getProducts(req, res);
      case "POST":
        return await createProduct(req, res);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Product API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function getProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const products = await prisma.product.findMany({
      include: {
        variantGroups: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description || "",
      base_price_bdt: parseFloat(product.basePriceBdt.toString()),
      sell_price_bdt: parseFloat(product.sellPriceBdt.toString()),
      image_url: product.imageUrl || "",
      source_link: product.sourceLink || "",
      is_active: product.isActive,
      variant_groups: product.variantGroups.map((vg) => ({
        id: vg.id,
        color: vg.color,
        sizes: vg.sizes || [],
        sell_price_override: vg.sellPriceOverride
          ? parseFloat(vg.sellPriceOverride.toString())
          : null,
        image_url: vg.imageUrl || null,
      })),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    }));

    return res.status(200).json(formattedProducts);
  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({
      error: "Failed to fetch products",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function createProduct(req: NextApiRequest, res: NextApiResponse) {
  const {
    name,
    code,
    description,
    base_price_bdt,
    sell_price_bdt,
    image_url,
    source_link,
    is_active = true,
    variant_groups = [],
  } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Product name is required" });
  }

  if (!code || !code.trim()) {
    return res.status(400).json({ error: "Product code is required" });
  }

  if (base_price_bdt === undefined || base_price_bdt === null) {
    return res.status(400).json({ error: "Base price is required" });
  }

  if (sell_price_bdt === undefined || sell_price_bdt === null) {
    return res.status(400).json({ error: "Sell price is required" });
  }

  // Validate variant groups if provided
  if (variant_groups && Array.isArray(variant_groups)) {
    for (const vg of variant_groups) {
      if (!vg.color || !vg.color.trim()) {
        return res
          .status(400)
          .json({ error: "Variant group color is required" });
      }
      if (!Array.isArray(vg.sizes)) {
        return res
          .status(400)
          .json({ error: "Variant group sizes must be an array" });
      }
    }
  }

  try {
    // Create product with variant groups in a transaction
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        code: code.trim(),
        description: description?.trim() || null,
        basePriceBdt: parseFloat(base_price_bdt),
        sellPriceBdt: parseFloat(sell_price_bdt),
        imageUrl: image_url?.trim() || null,
        sourceLink: source_link?.trim() || null,
        isActive: is_active,
        variantGroups:
          variant_groups && variant_groups.length > 0
            ? {
                create: (variant_groups as VariantGroupInput[]).map((vg) => ({
                  color: vg.color?.trim() || "",
                  sizes: Array.isArray(vg.sizes) ? vg.sizes : [],
                  sellPriceOverride: vg.sell_price_override
                    ? parseFloat(vg.sell_price_override.toString())
                    : null,
                  imageUrl: vg.image_url?.trim() || null,
                })),
              }
            : undefined,
      },
      include: {
        variantGroups: true,
      },
    });

    return res.status(201).json({
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description,
      base_price_bdt: parseFloat(product.basePriceBdt.toString()),
      sell_price_bdt: parseFloat(product.sellPriceBdt.toString()),
      image_url: product.imageUrl,
      source_link: product.sourceLink,
      is_active: product.isActive,
      variant_groups: product.variantGroups.map((vg) => ({
        id: vg.id,
        color: vg.color,
        sizes: vg.sizes || [],
        sell_price_override: vg.sellPriceOverride
          ? parseFloat(vg.sellPriceOverride.toString())
          : null,
        image_url: vg.imageUrl,
      })),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    });
  } catch (error) {
    console.error("Create product error:", error);
    const prismaError = error as {
      code?: string;
      meta?: { target?: unknown };
      message?: string;
    };

    // Handle Prisma unique constraint violations
    if (prismaError.code === "P2002") {
      return res.status(400).json({ error: "Product code already exists" });
    }

    // Handle other Prisma errors
    if (prismaError.code && prismaError.code.startsWith("P")) {
      return res.status(400).json({
        error: "Database error",
        details: prismaError.meta?.target || prismaError.message,
      });
    }

    return res.status(500).json({
      error: "Failed to create product",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
