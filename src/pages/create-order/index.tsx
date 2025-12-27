/* eslint-disable @typescript-eslint/no-require-imports */
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select } from "@/components/ui";
import { getSettings } from "@/utils/local-storage";
import { productsAPI, customersAPI, ordersAPI } from "@/utils/api-client";
// import { showToast } from "@/components/utils";
import { Product, Customer } from "@/types";
import { ArrowLeft, Plus, X, Search, Package } from "lucide-react";
import { formatBDT } from "@/components/utils";
import { usePathaoLocations } from "@/hooks/use-pathao-locations";

export interface OrderFormData {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  pathao_district?: string;
  pathao_zone?: string;
  pathao_area?: string;
  pathao_city_id?: number;
  pathao_zone_id?: number;
  pathao_area_id?: number;
  delivery_type?: "inside_dhaka" | "sub_dhaka" | "outside_dhaka";
}

export interface OrderItemForm {
  product_id: number;
  product_name_snapshot: string;
  image_url_snapshot: string;
  sell_price_bdt_snapshot: number;
  qty: number;
  quantity: number;
  color_snapshot?: string;
  size_snapshot?: string;
  price?: number;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const customerPhone =
    typeof router.query.phone === "string" ? router.query.phone : undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState(() => {
    const { getSettings } = require("@/utils/local-storage");
    return getSettings();
  });

  // Pathao locations
  const {
    cities,
    zones,
    areas,
    loading: pathaoLoading,
    error: pathaoError,
    fetchZones,
    fetchAreas,
  } = usePathaoLocations();

  const [selectedProducts, setSelectedProducts] = useState<OrderItemForm[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");

  // Customer autocomplete
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerInputRef = useRef<HTMLDivElement>(null);

  // Product search autocomplete
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: "",
    customer_phone: customerPhone || "",
    delivery_address: "",
    delivery_type: "inside_dhaka",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsData = await productsAPI.getAll();
        setProducts(productsData);
        setProducts(productsData);

        const customersData = await customersAPI.getAll();
        setCustomers(customersData);
        setCustomers(customersData);

        // Load settings from localStorage
        const currentSettings = getSettings();
        setSettings(currentSettings);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Debug: Log products when they're loaded
  useEffect(() => {
    if (products.length > 0) {
      console.log("✅ Products loaded:", products.length);
      const productsWithVariants = products.filter(
        (p: Product) =>
          p.variant_groups &&
          Array.isArray(p.variant_groups) &&
          p.variant_groups.length > 0
      );
      console.log(
        `📦 Products with variants: ${productsWithVariants.length}/${products.length}`
      );
      productsWithVariants.forEach((product: Product) => {
        console.log(
          `  • "${product.name}" (ID: ${product.id})`,
          product.variant_groups
        );
      });
    }
  }, [products]);

  // Load editing order if exists
  useEffect(() => {
    const editingOrderId = null; // Removed: use /update-order/[id] page instead
    if (editingOrderId && customers.length > 0 && cities.length > 0) {
      // Load order data for editing
      const loadOrderForEditing = async () => {
        try {
          const order = await ordersAPI.getById(editingOrderId);
          const customer = customers.find((c) => c.id === order.customer_id);

          if (!customer) return;

          // Set basic form data first
          const baseFormData = {
            customer_name: customer.name,
            customer_phone: customer.phone,
            delivery_address: order.address,
            delivery_type: "inside_dhaka" as const,
            pathao_city_id: undefined as number | undefined,
            pathao_zone_id: undefined as number | undefined,
            pathao_area_id: undefined as number | undefined,
            pathao_district: order.pathao_city_name || undefined,
            pathao_zone: order.pathao_zone_name || undefined,
            pathao_area: order.pathao_area_name || undefined,
          };

          // If order has Pathao location names, find and set IDs
          if (order.pathao_city_name) {
            // Find city ID from city name
            const foundCity = cities.find(
              (c) => c.city_name.trim() === order.pathao_city_name?.trim()
            );

            if (foundCity) {
              baseFormData.pathao_city_id = foundCity.city_id;

              // Fetch zones for this city
              await fetchZones(foundCity.city_id);

              // Wait a bit for zones to load, then find zone ID
              setTimeout(async () => {
                if (order.pathao_zone_name) {
                  const foundZone = zones.find(
                    (z) => z.zone_name.trim() === order.pathao_zone_name?.trim()
                  );

                  if (foundZone) {
                    baseFormData.pathao_zone_id = foundZone.zone_id;

                    // Fetch areas for this zone
                    await fetchAreas(foundZone.zone_id);

                    // Wait a bit for areas to load, then find area ID
                    setTimeout(() => {
                      if (order.pathao_area_name) {
                        const foundArea = areas.find(
                          (a) =>
                            a.area_name.trim() ===
                            order.pathao_area_name?.trim()
                        );

                        if (foundArea) {
                          baseFormData.pathao_area_id = foundArea.area_id;
                        }
                      }

                      // Update form data with all IDs
                      setFormData(baseFormData);
                    }, 500);
                  } else {
                    setFormData(baseFormData);
                  }
                } else {
                  setFormData(baseFormData);
                }
              }, 500);
            } else {
              // City not found, just set names
              setFormData(baseFormData);
            }
          } else {
            // No Pathao location data
            setFormData(baseFormData);
          }

          // Set selected products from order items
          const orderItems: OrderItemForm[] = order.items.map((item) => ({
            product_id: item.product_id,
            product_name_snapshot: item.product_name_snapshot,
            image_url_snapshot: item.image_url_snapshot,
            qty: item.qty,
            quantity: item.quantity || item.qty,
            sell_price_bdt_snapshot: item.sell_price_bdt_snapshot,
            price: item.price || item.sell_price_bdt_snapshot,
            color_snapshot: item.color_snapshot,
            size_snapshot: item.size_snapshot,
          }));
          setSelectedProducts(orderItems);
          setAdvanceAmount(order.advance_bdt);
          // Removed: setEditingOrderId(null)
        } catch (error) {
          console.error("Error loading order for editing:", error);
        }
      };

      loadOrderForEditing();
    }
  }, [customers, cities, zones, areas, fetchZones, fetchAreas]);

  useEffect(() => {
    if (customerPhone) {
      const customer = customers.find((c) => c.phone === customerPhone);
      if (customer) {
        setFormData({
          ...formData,
          customer_name: customer.name,
          customer_phone: customer.phone,
          delivery_address: customer.address || "",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone, customers]);

  // Filter customers for autocomplete
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(formData.customer_name.toLowerCase())
  );

  // Filter products for search
  const filteredProducts = products.filter((product: Product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.code.toLowerCase().includes(query) ||
      product.id.toString().includes(query)
    );
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target as Node)
      ) {
        setShowCustomerSuggestions(false);
      }
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target as Node)
      ) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Show suggestions when typing
  useEffect(() => {
    if (formData.customer_name.length > 0 && filteredCustomers.length > 0) {
      setShowCustomerSuggestions(true);
    } else {
      setShowCustomerSuggestions(false);
    }
  }, [formData.customer_name, filteredCustomers.length]);

  // Show product suggestions when typing
  useEffect(() => {
    if (searchQuery.length > 0 && filteredProducts.length > 0) {
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
    }
  }, [searchQuery, filteredProducts.length]);

  // Handle customer selection from suggestions
  const handleCustomerSelect = (customer: (typeof customers)[0]) => {
    setFormData({
      ...formData,
      customer_name: customer.name,
      customer_phone: customer.phone,
      delivery_address: customer.address || "",
    });
    setShowCustomerSuggestions(false);
  };

  const handleAddProduct = () => {
    setSelectedProducts((prev) => [
      ...prev,
      {
        product_id: 0,
        product_name_snapshot: "",
        image_url_snapshot: "",
        qty: 1,
        sell_price_bdt_snapshot: 0,
        price: 0,
        quantity: 1,
        color_snapshot: undefined,
        size_snapshot: undefined,
      } as OrderItemForm,
    ]);
  };

  // Handle selecting a product with variant from search
  const handleSelectProductWithVariant = (
    product: Product,
    color?: string,
    size?: string
  ) => {
    const { colors, sizes } = getProductVariants(product.id);

    // Determine price - check if variant has price override
    let price = product.sell_price_bdt;
    let imageUrl = product.image_url;

    if (color && product.variant_groups) {
      const variantGroup = product.variant_groups.find(
        (vg) => vg.color === color
      );
      if (variantGroup?.sell_price_override) {
        price = variantGroup.sell_price_override;
      }
      if (variantGroup?.image_url) {
        imageUrl = variantGroup.image_url;
      }
    }

    const newItem: OrderItemForm = {
      product_id: product.id,
      product_name_snapshot: product.name,
      image_url_snapshot: imageUrl,
      sell_price_bdt_snapshot: price,
      qty: 1,
      quantity: 1,
      price: price,
      color_snapshot: color || (colors.length > 0 ? colors[0] : undefined),
      size_snapshot: size || (sizes.length > 0 ? sizes[0] : undefined),
    };

    setSelectedProducts((prev) => [...prev, newItem]);
    setSearchQuery("");
    setShowProductSuggestions(false);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    if (!product) return;

    // Debug: Log selected product and its variants
    console.log("🎯 Product selected:", {
      id: product.id,
      name: product.name,
      variant_groups: product.variant_groups,
      hasVariants:
        product.variant_groups &&
        Array.isArray(product.variant_groups) &&
        product.variant_groups.length > 0,
      variant_groups_type: typeof product.variant_groups,
      variant_groups_is_array: Array.isArray(product.variant_groups),
    });

    const { colors, sizes } = getProductVariants(productId);
    console.log("🎨 Extracted variants:", { colors, sizes });

    setSelectedProducts((prev) =>
      prev.map((item: OrderItemForm, i: number) => {
        if (i === index) {
          return {
            ...item,
            product_id: productId,
            product_name_snapshot: product.name,
            image_url_snapshot: product.image_url,
            sell_price_bdt_snapshot: product.sell_price_bdt,
            price: product.sell_price_bdt,
            qty: item.qty || 1,
            quantity: item.quantity || item.qty || 1,
            color_snapshot: undefined,
            size_snapshot: undefined,
          };
        }
        return item;
      })
    );
  };

  const handleVariantChange = (
    index: number,
    variantType: "color" | "size",
    value: string
  ) => {
    const product = products.find(
      (p: Product) => p.id === selectedProducts[index].product_id
    );
    if (!product || !product.variant_groups) return;

    setSelectedProducts((prev) =>
      prev.map((item: OrderItemForm, i: number) => {
        if (i === index) {
          const updatedItem = {
            ...item,
            [variantType === "color" ? "color_snapshot" : "size_snapshot"]:
              value,
          };

          // Update price if variant has price override
          if (variantType === "color" && product.variant_groups) {
            const variantGroup = product.variant_groups.find(
              (vg) => vg.color === value
            );
            if (variantGroup?.sell_price_override) {
              updatedItem.sell_price_bdt_snapshot =
                variantGroup.sell_price_override;
              updatedItem.price = variantGroup.sell_price_override;
            }
          }

          // Update image if variant has specific image
          if (variantType === "color" && product.variant_groups) {
            const variantGroup = product.variant_groups.find(
              (vg) => vg.color === value
            );
            if (variantGroup?.image_url) {
              updatedItem.image_url_snapshot = variantGroup.image_url;
            }
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((item: OrderItemForm, i: number) => {
        if (i === index) {
          const qty = isNaN(quantity) || quantity < 1 ? 1 : quantity;
          return {
            ...item,
            qty,
            quantity: qty,
          };
        }
        return item;
      })
    );
  };

  const handlePriceChange = (index: number, price: number) => {
    setSelectedProducts((prev) =>
      prev.map((item: OrderItemForm, i: number) => {
        if (i === index) {
          return {
            ...item,
            price: price,
            sell_price_bdt_snapshot: price,
          };
        }
        return item;
      })
    );
  };

  const getProductVariants = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    if (!product) {
      return { colors: [], sizes: [] };
    }

    // Check if variant_groups exists and is an array
    if (
      !product.variant_groups ||
      !Array.isArray(product.variant_groups) ||
      product.variant_groups.length === 0
    ) {
      return { colors: [], sizes: [] };
    }

    const colors = [
      ...new Set(product.variant_groups.map((vg) => vg.color).filter(Boolean)),
    ];

    const sizes = [
      ...new Set(
        product.variant_groups
          .flatMap((vg) => (Array.isArray(vg.sizes) ? vg.sizes : []))
          .filter(Boolean)
      ),
    ];

    return { colors, sizes };
  };

  const getDeliveryCharge = () => {
    switch (formData.delivery_type) {
      case "inside_dhaka":
        return settings.deliveryCharges.inside_dhaka;
      case "sub_dhaka":
        return settings.deliveryCharges.inside_dhaka; // You may want to add sub_dhaka to settings
      case "outside_dhaka":
        return settings.deliveryCharges.outside_dhaka;
      default:
        return settings.deliveryCharges.inside_dhaka;
    }
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce(
      (sum: number, item: OrderItemForm) => {
        const price = item.price || item.sell_price_bdt_snapshot || 0;
        const qty = item.quantity || item.qty || 0;
        return sum + price * qty;
      },
      0
    );

    const deliveryCharge = getDeliveryCharge();
    const total = subtotal + deliveryCharge;
    const due = total - advanceAmount;

    return {
      subtotal,
      deliveryCharge,
      total,
      due,
    };
  };

  const handleCreateOrder = async () => {
    if (
      !formData.customer_name ||
      !formData.customer_phone ||
      !formData.delivery_address
    ) {
      alert("Please fill in all customer details");
      return;
    }

    if (selectedProducts.length === 0) {
      alert("Please add at least one product");
      return;
    }

    if (selectedProducts.some((item) => item.product_id === 0)) {
      alert("Please select all products");
      return;
    }

    // Validate variants if product has variant_groups
    for (const item of selectedProducts) {
      const product = products.find((p: Product) => p.id === item.product_id);
      if (product?.variant_groups && product.variant_groups.length > 0) {
        const { colors, sizes } = getProductVariants(item.product_id);
        if (colors.length > 0 && !item.color_snapshot) {
          alert(`Please select a color for ${item.product_name_snapshot}`);
          return;
        }
        if (sizes.length > 0 && !item.size_snapshot) {
          alert(`Please select a size for ${item.product_name_snapshot}`);
          return;
        }
      }
    }

    setIsCreating(true);

    try {
      // Find or create customer
      let customer = customers.find((c) => c.phone === formData.customer_phone);

      if (!customer) {
        customer = await customersAPI.create({
          name: formData.customer_name,
          phone: formData.customer_phone,
          email: "",
          address: formData.delivery_address,
        });
        // Refresh customers
        const updatedCustomers = await customersAPI.getAll();
        setCustomers(updatedCustomers);
        setCustomers(updatedCustomers);
      }

      const { deliveryCharge } = calculateTotals();

      // Convert OrderItemForm to order items format
      const orderItems = selectedProducts.map((item) => ({
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        image_url_snapshot: item.image_url_snapshot,
        qty: item.qty || item.quantity || 1,
        quantity: item.quantity || item.qty || 1,
        sell_price_bdt_snapshot: item.sell_price_bdt_snapshot,
        price: item.price || item.sell_price_bdt_snapshot,
        ...(item.color_snapshot && { color_snapshot: item.color_snapshot }),
        ...(item.size_snapshot && { size_snapshot: item.size_snapshot }),
      }));

      // Create order via API
      await ordersAPI.create({
        customer_id: customer.id!,
        items: orderItems,
        status: "pending",
        address: formData.delivery_address,
        delivery_charge_bdt: deliveryCharge,
        advance_bdt: advanceAmount,
        estimated_delivery_date: estimatedDeliveryDate || undefined,
        pathao_city_name: formData.pathao_district || undefined,
        pathao_zone_name: formData.pathao_zone || undefined,
        pathao_area_name: formData.pathao_area || undefined,
        pathao_tracking_code: undefined,
        pathao_status: undefined,
      });

      alert("Order created successfully");
      router.push("/orders");
    } catch (error: unknown) {
      console.error("Error creating order:", error);
      const errorMessage =
        error && typeof error === "object" && "error" in error
          ? String((error as { error: string }).error)
          : "Failed to create order. Please try again.";
      alert(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const { subtotal, deliveryCharge, due } = calculateTotals();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Create New Order</h1>
      </div>

      <div className="grid gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>

            {/* Product Search */}
            <div className="mb-4 relative" ref={productSearchRef}>
              <Input
                placeholder="Search product by ID, name, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.length > 0 && filteredProducts.length > 0) {
                    setShowProductSuggestions(true);
                  }
                }}
                icon={<Search className="w-5 h-5 text-gray-400" />}
              />
              {showProductSuggestions && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {filteredProducts.slice(0, 20).map((product: Product) => {
                    const { colors, sizes } = getProductVariants(product.id);
                    const hasVariants = colors.length > 0 || sizes.length > 0;

                    return (
                      <div
                        key={product.id}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        {/* Main product option */}
                        <div
                          onClick={() => {
                            handleSelectProductWithVariant(product);
                          }}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-12 h-12 rounded-md object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Code: {product.code} •{" "}
                                {formatBDT(product.sell_price_bdt)}
                              </div>
                              {hasVariants && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {colors.length > 0 &&
                                    `${colors.length} color${
                                      colors.length > 1 ? "s" : ""
                                    }`}
                                  {colors.length > 0 &&
                                    sizes.length > 0 &&
                                    " • "}
                                  {sizes.length > 0 &&
                                    `${sizes.length} size${
                                      sizes.length > 1 ? "s" : ""
                                    }`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Variant options if product has variants */}
                        {hasVariants && (
                          <div className="bg-gray-50 border-t border-gray-100">
                            {colors.length > 0 && sizes.length > 0
                              ? // Show all color-size combinations
                                colors.flatMap((color) =>
                                  sizes.map((size) => (
                                    <div
                                      key={`${product.id}-${color}-${size}`}
                                      onClick={() => {
                                        handleSelectProductWithVariant(
                                          product,
                                          color,
                                          size
                                        );
                                      }}
                                      className="px-4 py-2 pl-12 hover:bg-gray-100 cursor-pointer transition-colors text-sm"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-700">
                                          {color} / {size}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          {formatBDT(product.sell_price_bdt)}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )
                              : colors.length > 0
                              ? // Only colors, no sizes
                                colors.map((color) => (
                                  <div
                                    key={`${product.id}-${color}`}
                                    onClick={() => {
                                      handleSelectProductWithVariant(
                                        product,
                                        color
                                      );
                                    }}
                                    className="px-4 py-2 pl-12 hover:bg-gray-100 cursor-pointer transition-colors text-sm"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-700">
                                        {color}
                                      </span>
                                      <span className="text-gray-500 text-xs">
                                        {formatBDT(product.sell_price_bdt)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              : // Only sizes, no colors
                                sizes.map((size) => (
                                  <div
                                    key={`${product.id}-${size}`}
                                    onClick={() => {
                                      handleSelectProductWithVariant(
                                        product,
                                        undefined,
                                        size
                                      );
                                    }}
                                    className="px-4 py-2 pl-12 hover:bg-gray-100 cursor-pointer transition-colors text-sm"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-700">
                                        Size: {size}
                                      </span>
                                      <span className="text-gray-500 text-xs">
                                        {formatBDT(product.sell_price_bdt)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Product Button */}
            {selectedProducts.length > 0 && (
              <Button
                onClick={handleAddProduct}
                variant="secondary"
                className="w-full mb-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            )}

            {/* Added Products Table */}
            <div className="mb-4">
              {selectedProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products added yet</p>
                  <Button
                    onClick={handleAddProduct}
                    className="mt-4"
                    variant="secondary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Products
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Image
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedProducts.map((item, index) => {
                          const { colors, sizes } = getProductVariants(
                            item.product_id
                          );

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.image_url_snapshot ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.image_url_snapshot}
                                    alt={item.product_name_snapshot}
                                    className="w-12 h-12 object-cover rounded border"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                                    <Package className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {item.product_id === 0 ? (
                                  <Select
                                    value="0"
                                    onChange={(e) =>
                                      handleProductChange(
                                        index,
                                        parseInt(e.target.value)
                                      )
                                    }
                                    options={[
                                      { value: "0", label: "Select product" },
                                      ...filteredProducts.map(
                                        (product: Product) => ({
                                          value: product.id.toString(),
                                          label: `${product.name} (${formatBDT(
                                            product.sell_price_bdt
                                          )})`,
                                        })
                                      ),
                                    ]}
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.product_name_snapshot}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {item.product_id === 0 ? (
                                  <span className="text-sm text-gray-400">
                                    -
                                  </span>
                                ) : colors.length > 0 ? (
                                  <Select
                                    value={item.color_snapshot || ""}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        index,
                                        "color",
                                        e.target.value
                                      )
                                    }
                                    options={[
                                      { value: "", label: "Select color" },
                                      ...colors.map((color) => ({
                                        value: color,
                                        label: color,
                                      })),
                                    ]}
                                  />
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {item.product_id === 0 ? (
                                  <span className="text-sm text-gray-400">
                                    -
                                  </span>
                                ) : sizes.length > 0 ? (
                                  <Select
                                    value={item.size_snapshot || ""}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        index,
                                        "size",
                                        e.target.value
                                      )
                                    }
                                    options={[
                                      { value: "", label: "Select size" },
                                      ...sizes.map((size) => ({
                                        value: size,
                                        label: size,
                                      })),
                                    ]}
                                  />
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  placeholder="Price"
                                  value={
                                    item.price ||
                                    item.sell_price_bdt_snapshot ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    handlePriceChange(
                                      index,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="text-sm w-24"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity || item.qty || 1}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      index,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="text-sm w-20"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveProduct(index)}
                                  className="p-1 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                                  title="Remove product"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="font-medium">{formatBDT(deliveryCharge)}</span>
              </div>
              <div className="mt-3">
                <Input
                  label="Advance (BDT)"
                  type="number"
                  value={advanceAmount || ""}
                  onChange={(e) =>
                    setAdvanceAmount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-semibold text-blue-600">DUE</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatBDT(due)}
                </span>
              </div>

              {/* Estimated Delivery Date */}
              <div className="mt-4">
                <Input
                  label="Estimated Delivery Date"
                  type="date"
                  value={estimatedDeliveryDate}
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Customer & Delivery</h2>

            <div className="space-y-4 grid grid-cols-2 gap-2">
              <div ref={customerInputRef} className="relative">
                <Input
                  label="Customer Name"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customer_name: e.target.value,
                    }))
                  }
                  onFocus={() => {
                    if (
                      formData.customer_name.length > 0 &&
                      filteredCustomers.length > 0
                    ) {
                      setShowCustomerSuggestions(true);
                    }
                  }}
                  required
                />
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.slice(0, 10).map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {customer.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {customer.phone}
                          {customer.address && ` • ${customer.address}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Input
                label="Phone"
                value={formData.customer_phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer_phone: e.target.value,
                  }))
                }
                required
              />

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Address
                </label>
                <textarea
                  className="block w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 hover:border-gray-300"
                  value={formData.delivery_address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      delivery_address: e.target.value,
                    }))
                  }
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">
                Pathao Location
              </h3>
              {pathaoError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {pathaoError}. Please ensure you have generated a Pathao
                    token.
                  </p>
                </div>
              )}
              <div className="space-y-4 grid grid-cols-3 gap-2">
                <Select
                  label="City"
                  value={formData.pathao_city_id?.toString() || ""}
                  onChange={(e) => {
                    const cityId = e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined;
                    const selectedCity = cities.find(
                      (c) => c.city_id === cityId
                    );
                    setFormData((prev) => ({
                      ...prev,
                      pathao_city_id: cityId,
                      pathao_district: selectedCity?.city_name || undefined,
                      pathao_zone_id: undefined,
                      pathao_zone: undefined,
                      pathao_area_id: undefined,
                      pathao_area: undefined,
                    }));
                    if (cityId) {
                      fetchZones(cityId);
                    }
                  }}
                  options={[
                    {
                      value: "",
                      label: pathaoLoading
                        ? "Loading cities..."
                        : "Select City",
                    },
                    ...cities.map((city) => ({
                      value: city.city_id.toString(),
                      label: city.city_name.trim(),
                    })),
                  ]}
                  disabled={pathaoLoading}
                />
                <Select
                  label="Zone"
                  value={formData.pathao_zone_id?.toString() || ""}
                  onChange={(e) => {
                    const zoneId = e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined;
                    const selectedZone = zones.find(
                      (z) => z.zone_id === zoneId
                    );
                    setFormData((prev) => ({
                      ...prev,
                      pathao_zone_id: zoneId,
                      pathao_zone: selectedZone?.zone_name || undefined,
                      pathao_area_id: undefined,
                      pathao_area: undefined,
                    }));
                    if (zoneId) {
                      fetchAreas(zoneId);
                    }
                  }}
                  options={[
                    {
                      value: "",
                      label: pathaoLoading ? "Loading zones..." : "Select Zone",
                    },
                    ...zones.map((zone) => ({
                      value: zone.zone_id.toString(),
                      label: zone.zone_name.trim(),
                    })),
                  ]}
                  disabled={!formData.pathao_city_id || pathaoLoading}
                />
                <Select
                  label="Area"
                  value={formData.pathao_area_id?.toString() || ""}
                  onChange={(e) => {
                    const areaId = e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined;
                    const selectedArea = areas.find(
                      (a) => a.area_id === areaId
                    );
                    setFormData((prev) => ({
                      ...prev,
                      pathao_area_id: areaId,
                      pathao_area: selectedArea?.area_name || undefined,
                    }));
                  }}
                  options={[
                    {
                      value: "",
                      label: pathaoLoading ? "Loading areas..." : "Select Area",
                    },
                    ...areas.map((area) => ({
                      value: area.area_id.toString(),
                      label: area.area_name.trim(),
                    })),
                  ]}
                  disabled={!formData.pathao_zone_id || pathaoLoading}
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Delivery Charge (BDT)
              </h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_type"
                    value="inside_dhaka"
                    checked={formData.delivery_type === "inside_dhaka"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delivery_type: e.target.value as
                          | "inside_dhaka"
                          | "sub_dhaka"
                          | "outside_dhaka",
                      }))
                    }
                    className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Inside Dhaka</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_type"
                    value="sub_dhaka"
                    checked={formData.delivery_type === "sub_dhaka"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delivery_type: e.target.value as
                          | "inside_dhaka"
                          | "sub_dhaka"
                          | "outside_dhaka",
                      }))
                    }
                    className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Sub Dhaka</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_type"
                    value="outside_dhaka"
                    checked={formData.delivery_type === "outside_dhaka"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delivery_type: e.target.value as
                          | "inside_dhaka"
                          | "sub_dhaka"
                          | "outside_dhaka",
                      }))
                    }
                    className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Outside Dhaka</span>
                </label>
              </div>
            </div>
          </div>
          {/* Save Order Button */}
          <Button
            onClick={handleCreateOrder}
            disabled={isCreating}
            className="w-full mt-4 bg-green-600 hover:bg-green-700"
          >
            {isCreating ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
