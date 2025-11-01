"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import useStore from "@/store";
import {
  generateProductCode,
  showToast,
  callGeminiAPI,
} from "@/components/utils";
import { Product } from "@/types";
import { productsAPI } from "@/utils/api-client";
import { useImageUpload } from "@/hooks/use-image-upload";
import { Plus, Search, Trash2, Sparkles, Check } from "lucide-react";
import Head from "next/head";

interface VariantGroup {
  color: string;
  sizes: string[];
  sell_price_override: string;
  image_file: File | null;
  image_url?: string;
}

interface ProductFormData {
  name: string;
  code: string;
  source_link: string;
  base_price_bdt: string;
  sell_price_bdt: string;
  main_image_file: File | null;
  main_image_url: string;
  description: string;
  is_active: boolean;
  variant_groups: VariantGroup[];
}

const getInitialFormState = (): ProductFormData => ({
  name: "",
  code: "",
  source_link: "",
  base_price_bdt: "",
  sell_price_bdt: "",
  main_image_file: null,
  main_image_url: "",
  description: "",
  is_active: true,
  variant_groups: [],
});

const parseNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const getProductIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("shirt") || lower.includes("t-shirt")) return "T-Shirt";
  if (lower.includes("jean")) return "Jeans";
  if (lower.includes("hoodie")) return "Hoodie";
  if (lower.includes("cap")) return "Cap";
  return "Prod";
};

const getProductIconColor = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("shirt") || lower.includes("t-shirt"))
    return "bg-blue-500";
  if (lower.includes("jean")) return "bg-blue-600";
  if (lower.includes("hoodie")) return "bg-gray-700";
  if (lower.includes("cap")) return "bg-green-500";
  return "bg-gray-500";
};

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(() =>
    getInitialFormState()
  );
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Image upload hooks
  const {
    uploadImage: uploadMainImage,
    isUploading: isUploadingMain,
    uploadProgress: mainProgress,
  } = useImageUpload({ folder: "products" });

  const {
    uploadImage: uploadVariantImage,
    isUploading: isUploadingVariant,
    uploadProgress: variantProgress,
  } = useImageUpload({ folder: "variants" });

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const variantImageInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {}
  );

  const { products, fetchProducts } = useStore();

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData(getInitialFormState());
    setIsEditing(false);
    setEditingProductId(null);
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = "";
    }
    Object.values(variantImageInputRefs.current).forEach((ref) => {
      if (ref) ref.value = "";
    });
    variantImageInputRefs.current = {};
  };

  const handleMainImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        main_image_file: file,
        main_image_url: previewUrl,
      }));

      // Upload to R2 using hook
      try {
        const uploadedUrl = await uploadMainImage(file);
        setFormData((prev) => ({
          ...prev,
          main_image_url: uploadedUrl,
        }));
        showToast("Image uploaded successfully", "success");
      } catch (error) {
        console.error("Upload error:", error);
        showToast("Failed to upload image. Using local preview.", "error");
      }
    }
  };

  const handleVariantImageChange = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => {
        const newGroups = [...prev.variant_groups];
        newGroups[index] = {
          ...newGroups[index],
          image_file: file,
          image_url: previewUrl,
        };
        return { ...prev, variant_groups: newGroups };
      });

      // Upload to R2 using hook
      try {
        const uploadedUrl = await uploadVariantImage(file);
        setFormData((prev) => {
          const newGroups = [...prev.variant_groups];
          newGroups[index] = {
            ...newGroups[index],
            image_url: uploadedUrl,
          };
          return { ...prev, variant_groups: newGroups };
        });
        showToast("Variant image uploaded successfully", "success");
      } catch (error) {
        console.error("Upload error:", error);
        showToast(
          "Failed to upload variant image. Using local preview.",
          "error"
        );
      }
    }
  };

  const handleAddVariantGroup = () => {
    setFormData((prev) => ({
      ...prev,
      variant_groups: [
        ...prev.variant_groups,
        {
          color: "",
          sizes: [],
          sell_price_override: "",
          image_file: null,
        },
      ],
    }));
  };

  const handleRemoveVariantGroup = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variant_groups: prev.variant_groups.filter((_, i) => i !== index),
    }));
    delete variantImageInputRefs.current[index];
  };

  const handleVariantGroupChange = (
    index: number,
    field: keyof VariantGroup,
    value: string | string[]
  ) => {
    setFormData((prev) => {
      const newGroups = [...prev.variant_groups];
      if (field === "sizes" && typeof value === "string") {
        newGroups[index] = {
          ...newGroups[index],
          sizes: value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
        };
      } else {
        newGroups[index] = {
          ...newGroups[index],
          [field]: value,
        };
      }
      return { ...prev, variant_groups: newGroups };
    });
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const description = await callGeminiAPI(
        `Generate a product description for: ${formData.name}`
      );
      setFormData((prev) => ({ ...prev, description }));
      showToast("Description generated successfully", "success");
    } catch {
      showToast("Failed to generate description", "error");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }

    const basePrice = parseNumber(formData.base_price_bdt);
    const sellPrice = parseNumber(formData.sell_price_bdt);

    if (basePrice <= 0 || sellPrice <= 0) {
      showToast("Base price and sell price must be greater than 0", "error");
      return;
    }

    const productCode = formData.code || generateProductCode(formData.name);

    const variantGroups = formData.variant_groups.map((group) => ({
      color: group.color,
      sizes: group.sizes,
      sell_price_override: group.sell_price_override
        ? parseNumber(group.sell_price_override)
        : undefined,
      image_url: group.image_url || "",
    }));

    if (isEditing && editingProductId) {
      // Update existing product
      const updatedProduct: Partial<Product> = {
        name: formData.name,
        code: productCode,
        source_link: formData.source_link,
        base_price_bdt: basePrice,
        sell_price_bdt: sellPrice,
        image_url: formData.main_image_url,
        description: formData.description,
        is_active: formData.is_active,
        variant_groups: variantGroups,
      };

      await productsAPI.update(editingProductId, updatedProduct);
      await fetchProducts();
      showToast("Product updated successfully", "success");
    } else {
      // Create new product
      const newProduct: Partial<Product> = {
        name: formData.name,
        code: productCode,
        source_link: formData.source_link,
        base_price_bdt: basePrice,
        sell_price_bdt: sellPrice,
        image_url: formData.main_image_url,
        description: formData.description,
        is_active: formData.is_active,
        variant_groups: variantGroups,
      };

      await productsAPI.create(newProduct as Product);
      await fetchProducts();
      showToast("Product created successfully", "success");
    }

    resetForm();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setIsEditing(true);
    setFormData({
      name: product.name,
      code: product.code,
      source_link: product.source_link || "",
      base_price_bdt: product.base_price_bdt.toString(),
      sell_price_bdt: product.sell_price_bdt.toString(),
      main_image_file: null,
      main_image_url: product.image_url,
      description: product.description || "",
      is_active: product.is_active,
      variant_groups:
        product.variant_groups?.map((vg) => ({
          color: vg.color,
          sizes: vg.sizes,
          sell_price_override: vg.sell_price_override?.toString() || "",
          image_file: null,
          image_url: vg.image_url,
        })) || [],
    });

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getVariantCount = (product: Product): number => {
    if (!product.variant_groups || product.variant_groups.length === 0)
      return 0;
    return product.variant_groups.reduce(
      (total, vg) => total + vg.sizes.length,
      0
    );
  };

  return (
    <>
      <Head>
        <title>Product Catalog</title>
      </Head>

      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-2xl font-semibold">Product Catalog</h1>
          </div>{" "}
          <Button
            onClick={() => {
              if (isEditing) resetForm();
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </Button>
        </div>

        {/* Add New Product Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {isEditing ? "Edit Product" : "Add New Product"}
          </h2>

          {/* Product Information */}
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Premium Cotton T-Shirt"
                required
              />
              <Input
                label="Product Code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="Will be auto-generated"
                disabled
                className="bg-gray-100"
              />
            </div>

            <Input
              label="Source Link"
              value={formData.source_link}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  source_link: e.target.value,
                }))
              }
              placeholder="https://example.com/product"
              type="url"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Base Price (BDT)"
                type="number"
                value={formData.base_price_bdt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    base_price_bdt: e.target.value,
                  }))
                }
                placeholder="0"
                required
              />
              <Input
                label="Sell Price (BDT)"
                type="number"
                value={formData.sell_price_bdt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sell_price_bdt: e.target.value,
                  }))
                }
                placeholder="0"
                required
              />
            </div>

            {/* Main Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Main Image
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={mainImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageChange}
                  className="hidden"
                  id="main-image-upload"
                  disabled={isUploadingMain}
                />
                <label htmlFor="main-image-upload" className="cursor-pointer">
                  <span className="inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-10 px-4 bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUploadingMain
                      ? `Uploading ${mainProgress}%...`
                      : "Choose File"}
                  </span>
                </label>
                <span className="text-sm text-gray-500">
                  {isUploadingMain
                    ? `Uploading... ${mainProgress}%`
                    : formData.main_image_file?.name || formData.main_image_url
                    ? formData.main_image_file?.name || "Image loaded"
                    : "No file chosen"}
                </span>
                {formData.main_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.main_image_url}
                    alt="Main product"
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-800">
                  Description
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || !formData.name.trim()}
                  className="flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter product description..."
                rows={4}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label
                htmlFor="is-active"
                className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer"
              >
                {formData.is_active && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
                Active
              </label>
            </div>
          </div>

          {/* Variant Groups */}
          <div className="border-t pt-6 mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Variant Groups
              </h3>
              <p className="text-sm text-gray-600">
                Add a group for each color. Enter all available sizes for that
                color, separated by commas.
              </p>
            </div>

            <div className="space-y-4 mb-4">
              {formData.variant_groups.map((group, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 relative bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveVariantGroup(index)}
                    className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700"
                    aria-label="Delete variant group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Color"
                      value={group.color}
                      onChange={(e) =>
                        handleVariantGroupChange(index, "color", e.target.value)
                      }
                      placeholder="e.g., Black"
                    />
                    <Input
                      label="Sizes (comma-separated)"
                      value={group.sizes.join(", ")}
                      onChange={(e) =>
                        handleVariantGroupChange(index, "sizes", e.target.value)
                      }
                      placeholder="e.g., M, L, XL"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Sell Price Override (for this group)"
                      type="number"
                      value={group.sell_price_override}
                      onChange={(e) =>
                        handleVariantGroupChange(
                          index,
                          "sell_price_override",
                          e.target.value
                        )
                      }
                      placeholder="Optional: Overrides main sell price"
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        Image for this Color
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          ref={(el) => {
                            variantImageInputRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleVariantImageChange(index, e)}
                          className="hidden"
                          id={`variant-image-${index}`}
                          disabled={isUploadingVariant}
                        />
                        <label
                          htmlFor={`variant-image-${index}`}
                          className="cursor-pointer"
                        >
                          <span
                            className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-9 px-3 text-sm bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 rounded-md ${
                              isUploadingVariant
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {isUploadingVariant
                              ? `Uploading ${variantProgress}%...`
                              : "Choose File"}
                          </span>
                        </label>
                        <span className="text-sm text-gray-500">
                          {isUploadingVariant
                            ? `Uploading... ${variantProgress}%`
                            : group.image_file?.name || group.image_url
                            ? group.image_file?.name || "Image loaded"
                            : "No file chosen"}
                        </span>
                        {group.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.image_url}
                            alt={`${group.color} variant`}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddVariantGroup}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Color Group
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Save Product
            </Button>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                className="pl-10"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PRODUCT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VARIANTS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PRICING (BASE/SELL)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`${getProductIconColor(
                            product.name
                          )} w-12 h-12 rounded flex items-center justify-center text-white font-semibold text-sm`}
                        >
                          {getProductIcon(product.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getVariantCount(product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ৳{product.base_price_bdt.toLocaleString()} / ৳
                      {product.sell_price_bdt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No products found. {searchQuery && "Try adjusting your search."}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
