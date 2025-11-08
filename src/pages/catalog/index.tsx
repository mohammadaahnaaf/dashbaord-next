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
import { Plus, Search, Trash2, Sparkles, Check, Loader2, ImageIcon } from "lucide-react";
import Head from "next/head";

interface VariantGroup {
  color: string;
  sizes: string[];
  quantities: Record<string, number>; // Map of size to quantity
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false); // Control form visibility
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

  async function fetchProducts() {
    setLoading(true);
    try {
      const products = await productsAPI.getAll();
      setProducts(products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setFormData(getInitialFormState());
    setIsEditing(false);
    setEditingProductId(null);
    setShowForm(false); // Hide form when resetting
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
          quantities: {},
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
    value: string | string[] | Record<string, number>
  ) => {
    setFormData((prev) => {
      const newGroups = [...prev.variant_groups];
      if (field === "sizes" && typeof value === "string") {
        const newSizes = value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);

        // Initialize quantities for new sizes
        const newQuantities: Record<string, number> = {};
        newSizes.forEach((size) => {
          newQuantities[size] = newGroups[index].quantities[size] || 0;
        });

        newGroups[index] = {
          ...newGroups[index],
          sizes: newSizes,
          quantities: newQuantities,
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

  const handleQuantityChange = (
    variantIndex: number,
    size: string,
    quantity: number
  ) => {
    setFormData((prev) => {
      const newGroups = [...prev.variant_groups];
      newGroups[variantIndex] = {
        ...newGroups[variantIndex],
        quantities: {
          ...newGroups[variantIndex].quantities,
          [size]: Math.max(0, quantity), // Ensure non-negative
        },
      };
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
    setIsLoading(true);
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
      quantities: group.quantities || {},
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
    setIsLoading(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setIsEditing(true);
    setShowForm(true); // Show form when editing
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
          quantities: (vg.quantities as Record<string, number>) || {},
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
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Product Catalog</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              {products.length} Products
            </span>
          </div>
          <Button
            onClick={() => {
              if (showForm && !isEditing) {
                // If form is shown and not editing, hide it
                resetForm();
              } else {
                // Show form for new product
                resetForm();
                setShowForm(true);
              }
            }}
            className="flex items-center gap-2"
          >
            {showForm && !isEditing ? (
              <>✕ Cancel</>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Product
              </>
            )}
          </Button>
        </div>

        {/* Add New Product Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {isEditing ? "Edit Product" : "Add New Product"}
            </h2>

            {/* Product Information */}
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      disabled={
                        isGeneratingDescription || !formData.name.trim()
                      }
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
                    rows={5}
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
                    <label
                      htmlFor="main-image-upload"
                      className="cursor-pointer"
                    >
                      <span className="flex flex-col text-gray-500 justify-center items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-2 w-40 h-40">
                        <ImageIcon className="w-6 h-6" />
                        {isUploadingMain
                          ? `Uploading ${mainProgress}%...`
                          : formData.main_image_url
                          ? "Change Image"
                          : "Choose Image"}
                      </span>
                    </label>
                    {isUploadingMain && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${mainProgress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {mainProgress}%
                        </span>
                      </div>
                    )}
                    {formData.main_image_url && !isUploadingMain && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.main_image_url}
                        alt="Main product"
                        className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* Active Status */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-800">
                  Status
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.is_active}
                  tabIndex={0}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: !prev.is_active,
                    }))
                  }
                  className={`relative inline-flex items-center h-7 w-14 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-0
                  ${formData.is_active ? "bg-green-600" : "bg-red-600"}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out 
                    ${formData.is_active ? "translate-x-8" : "translate-x-1"}`}
                  />
                  <span className="sr-only">Enable Active</span>
                </button>
              </div>
            </div>

            {/* Variant Groups */}
            <div className="border-t pt-6 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Variant Groups
                </h3>
                <p className="text-sm text-gray-600">
                  Add a group for each color. Specify sizes and quantities for
                  inventory tracking.
                </p>
              </div>

              <div className="space-y-6 mb-4">
                {formData.variant_groups.map((group, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-xl p-6 relative bg-linear-to-br from-gray-50 to-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveVariantGroup(index)}
                      className="absolute top-3 right-3 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete variant group"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="mb-4 pr-12">
                      <h4 className="text-md font-semibold text-gray-800">
                        Color Variant {index + 1}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <Input
                        label="Color"
                        value={group.color}
                        onChange={(e) =>
                          handleVariantGroupChange(
                            index,
                            "color",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Black, Navy Blue"
                      />
                      <div className="space-y-1">
                        <Input
                          label="Sizes (comma-separated)"
                          value={group.sizes.join(", ")}
                          onChange={(e) =>
                            handleVariantGroupChange(
                              index,
                              "sizes",
                              e.target.value
                            )
                          }
                          placeholder="Type: M, L, XL"
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <p className="text-xs text-gray-500 pl-1 flex items-center gap-1">
                          <span className="text-green-600">✓</span>
                          Separate with commas: M, L, XL, XXL
                          {group.sizes.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              {group.sizes.length} size
                              {group.sizes.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Quantity inputs for each size */}

                      {group.sizes.map((size) => (
                        <div key={size} className="flex flex-col w-full">
                          <Input
                            type="number"
                            min="0"
                            label={`Stock Quantity for ${size}`}
                            value={group.quantities[size] || 0}
                            onChange={(e) =>
                              handleQuantityChange(
                                index,
                                size,
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Sell Price Override"
                        type="number"
                        value={group.sell_price_override}
                        onChange={(e) =>
                          handleVariantGroupChange(
                            index,
                            "sell_price_override",
                            e.target.value
                          )
                        }
                        placeholder="Optional: Override price for this color"
                      />

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800">
                          Image for this Color
                        </label>
                        <div className="flex items-center gap-3">
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
                              className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-9 px-4 text-sm bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 rounded-md ${
                                isUploadingVariant
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {isUploadingVariant
                                ? `${variantProgress}%`
                                : group.image_url
                                ? "Change"
                                : "Upload"}
                            </span>
                          </label>
                          {isUploadingVariant && (
                            <div className="flex-1 max-w-xs">
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 transition-all duration-300"
                                  style={{ width: `${variantProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {group.image_url && !isUploadingVariant && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={group.image_url}
                              alt={`${group.color} variant`}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
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
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Product"
                )}
              </Button>
            </div>
          </div>
        )}

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
                    IMAGE
                  </th>
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                          />
                        ) : (
                          <div
                            className={`${getProductIconColor(
                              product.name
                            )} w-16 h-16 rounded-lg flex items-center justify-center text-white font-semibold text-sm`}
                          >
                            {getProductIcon(product.name)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.code}
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

            {products.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No products found. {searchQuery && "Try adjusting your search."}
              </div>
            )}
            {loading && (
              <div className="flex justify-center items-center h-full py-12">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
