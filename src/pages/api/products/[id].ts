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
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Product ID is required" });
  }

  try {
    switch (req.method) {
      case "GET":
        return await getProduct(req, res, parseInt(id));
      case "PUT":
        return await updateProduct(req, res, parseInt(id));
      case "DELETE":
        return await deleteProduct(req, res, parseInt(id));
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

async function getProduct(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variantGroups: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json({
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
        image_url: vg.imageUrl || null,
      })),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({
      error: "Failed to fetch product",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function updateProduct(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  const {
    name,
    code,
    description,
    base_price_bdt,
    sell_price_bdt,
    image_url,
    source_link,
    is_active,
    variant_groups,
  } = req.body;

  try {
    // First check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update product with variant groups
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(code !== undefined && { code: code.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(base_price_bdt !== undefined && {
          basePriceBdt: parseFloat(base_price_bdt),
        }),
        ...(sell_price_bdt !== undefined && {
          sellPriceBdt: parseFloat(sell_price_bdt),
        }),
        ...(image_url !== undefined && { imageUrl: image_url?.trim() || null }),
        ...(source_link !== undefined && {
          sourceLink: source_link?.trim() || null,
        }),
        ...(is_active !== undefined && { isActive: is_active }),
        ...(variant_groups && {
          variantGroups: {
            deleteMany: {}, // Delete existing variant groups
            create: (variant_groups as VariantGroupInput[]).map((vg) => ({
              color: vg.color?.trim() || "",
              sizes: Array.isArray(vg.sizes) ? vg.sizes : [],
              sellPriceOverride: vg.sell_price_override
                ? parseFloat(vg.sell_price_override.toString())
                : null,
              imageUrl: vg.image_url?.trim() || null,
            })),
          },
        }),
      },
      include: {
        variantGroups: true,
      },
    });

    return res.status(200).json({
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
        image_url: vg.imageUrl || null,
      })),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    });
  } catch (error) {
    console.error("Update product error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    if (prismaError.code === "P2002") {
      return res.status(400).json({ error: "Product code already exists" });
    }

    return res.status(500).json({
      error: "Failed to update product",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

async function deleteProduct(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  try {
    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    const prismaError = error as { code?: string; message?: string };

    if (prismaError.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(500).json({
      error: "Failed to delete product",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}
