/* eslint-disable @typescript-eslint/no-require-imports */
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select } from "@/components/ui";
import { getSettings } from "@/utils/local-storage";
import { productsAPI, customersAPI, ordersAPI } from "@/utils/api-client";
import { Product, Customer, Order } from "@/types";
import { Plus, X, Copy, Check } from "lucide-react";
import { formatBDT, showToast, copyToClipboard } from "@/components/utils";
import { usePathaoLocations } from "@/hooks/use-pathao-locations";
import Image from "next/image";
import { getValidPathaoToken } from "@/utils/pathao-token";
import { useAuth } from "@/contexts";

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

export default function UpdateOrderPage() {
  const router = useRouter();
  const { id } = router.query;
  const orderId = id ? parseInt(id as string, 10) : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState(() => {
    const { getSettings } = require("@/utils/local-storage");
    return getSettings();
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { pathaoStoreId } = useAuth();
  const [isSendingToPathao, setIsSendingToPathao] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pathaoOrderInfo, setPathaoOrderInfo] = useState<any>(null);
  const [isLoadingPathaoInfo, setIsLoadingPathaoInfo] = useState(false);
  const [isCopiedPathaoTracking, setIsCopiedPathaoTracking] = useState(false);

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

  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: "",
    customer_phone: "",
    delivery_address: "",
    delivery_type: "inside_dhaka",
  });

  const [selectedProducts, setSelectedProducts] = useState<OrderItemForm[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");

  // Customer autocomplete
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Load products and customers
        const [productsData, customersData] = await Promise.all([
          productsAPI.getAll(),
          customersAPI.getAll(),
        ]);

        setProducts(productsData);
        setProducts(productsData);
        setCustomers(customersData);
        setCustomers(customersData);

        // Load settings from localStorage
        const currentSettings = getSettings();
        setSettings(currentSettings);

        // Load order data if orderId exists
        if (orderId) {
          const orderData = await ordersAPI.getById(orderId);
          setOrder(orderData);

          // Set form data from order
          const customer = customersData.find(
            (c) => c.id === orderData.customer_id
          );
          if (customer) {
            // Determine delivery type from delivery charge
            const deliveryCharge = orderData.delivery_charge_bdt || 0;
            const outsideDhakaCharge =
              settings.deliveryCharges.outside_dhaka || 120;
            let deliveryType: "inside_dhaka" | "sub_dhaka" | "outside_dhaka" =
              "inside_dhaka";
            if (deliveryCharge >= outsideDhakaCharge) {
              deliveryType = "outside_dhaka";
            } else {
              deliveryType = "inside_dhaka";
            }

            const initialFormData: OrderFormData = {
              customer_name: customer.name,
              customer_phone: customer.phone,
              delivery_address: orderData.address,
              delivery_type: deliveryType,
              pathao_city_id: undefined,
              pathao_zone_id: undefined,
              pathao_area_id: undefined,
              pathao_district: orderData.pathao_city_name || undefined,
              pathao_zone: orderData.pathao_zone_name || undefined,
              pathao_area: orderData.pathao_area_name || undefined,
            };

            // If order has Pathao location names, find and set IDs
            if (orderData.pathao_city_name && cities.length > 0) {
              // Find city ID from city name
              const foundCity = cities.find(
                (c) => c.city_name.trim() === orderData.pathao_city_name?.trim()
              );

              if (foundCity) {
                initialFormData.pathao_city_id = foundCity.city_id;
                // Fetch zones for this city
                await fetchZones(foundCity.city_id);
              }
            }

            setFormData(initialFormData);

            // Set selected products from order items
            const orderItems: OrderItemForm[] = orderData.items.map((item) => ({
              product_id: item.product_id,
              product_name_snapshot: item.product_name_snapshot,
              image_url_snapshot: item.image_url_snapshot || "",
              qty: item.qty,
              quantity: item.quantity || item.qty,
              sell_price_bdt_snapshot: item.sell_price_bdt_snapshot,
              price: item.price || item.sell_price_bdt_snapshot,
              color_snapshot: item.color_snapshot || undefined,
              size_snapshot: item.size_snapshot || undefined,
            }));
            setSelectedProducts(orderItems);
            setAdvanceAmount(orderData.advance_bdt || 0);

            // Set estimated delivery date if exists
            if (orderData.estimated_delivery_date) {
              const date = new Date(orderData.estimated_delivery_date);
              const formattedDate = date.toISOString().split("T")[0];
              setEstimatedDeliveryDate(formattedDate);
            }
          }
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        alert("Failed to load order data. Please try again.");
        router.push("/orders");
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for cities to load before loading order data
    if (cities.length > 0 || pathaoError) {
      loadInitialData();
    }
  }, [
    orderId,
    cities,
    pathaoError,
    fetchZones,
    router,
    settings.deliveryCharges.inside_dhaka,
    settings.deliveryCharges.outside_dhaka,
  ]);

  // Update form data when zones are loaded for the order's city
  useEffect(() => {
    if (
      order &&
      zones.length > 0 &&
      formData.pathao_city_id &&
      !formData.pathao_zone_id
    ) {
      if (order.pathao_zone_name) {
        const foundZone = zones.find(
          (z) => z.zone_name.trim() === order.pathao_zone_name?.trim()
        );

        if (foundZone) {
          setFormData((prev) => ({
            ...prev,
            pathao_zone_id: foundZone.zone_id,
          }));
          // Fetch areas for this zone
          fetchAreas(foundZone.zone_id);
        }
      }
    }
  }, [
    order,
    zones,
    formData.pathao_city_id,
    formData.pathao_zone_id,
    fetchAreas,
  ]);

  // Update form data when areas are loaded for the order's zone
  useEffect(() => {
    if (
      order &&
      areas.length > 0 &&
      formData.pathao_zone_id &&
      !formData.pathao_area_id
    ) {
      if (order.pathao_area_name) {
        const foundArea = areas.find(
          (a) => a.area_name.trim() === order.pathao_area_name?.trim()
        );

        if (foundArea) {
          setFormData((prev) => ({
            ...prev,
            pathao_area_id: foundArea.area_id,
          }));
        }
      }
    }
  }, [order, areas, formData.pathao_zone_id, formData.pathao_area_id]);

  // Fetch Pathao order info when order has tracking code
  useEffect(() => {
    const fetchPathaoOrderInfo = async () => {
      if (!order?.pathao_tracking_code) {
        return;
      }

      setIsLoadingPathaoInfo(true);
      try {
        const token = await getValidPathaoToken();
        if (!token) {
          return;
        }

        const response = await fetch(
          `/api/pathao/order-info?consignment_id=${order.pathao_tracking_code}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.code === 200 && data.data) {
            setPathaoOrderInfo(data.data);
          }
        }
      } catch (err) {
        console.error("Error fetching Pathao order info:", err);
      } finally {
        setIsLoadingPathaoInfo(false);
      }
    };

    fetchPathaoOrderInfo();
  }, [order?.pathao_tracking_code]);

  const handleCopyPathaoTrackingLink = async () => {
    if (!order?.pathao_tracking_code || !order.customer_phone) return;
    const url = `https://merchant.pathao.com/tracking?consignment_id=${order.pathao_tracking_code}&phone=${order.customer_phone}`;
    try {
      await copyToClipboard(url);
      setIsCopiedPathaoTracking(true);
      showToast("Pathao tracking link copied to clipboard!", "success");
      setTimeout(() => setIsCopiedPathaoTracking(false), 2000);
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  const handleSendToPathao = async () => {
    if (!orderId) {
      showToast("Order ID is missing", "error");
      return;
    }

    if (
      !formData.pathao_city_id ||
      !formData.pathao_zone_id ||
      !formData.pathao_area_id
    ) {
      showToast(
        "Please set Pathao location (City, Zone, Area) before sending to Pathao",
        "error"
      );
      return;
    }

    setIsSendingToPathao(true);
    try {
      const token = await getValidPathaoToken();
      if (!token) {
        showToast(
          "No valid Pathao token. Please generate a token first.",
          "error"
        );
        return;
      }

      // Get customer
      const customer = customers.find(
        (c) => c.phone === formData.customer_phone
      );
      if (!customer) {
        showToast("Customer not found", "error");
        return;
      }

      // Calculate total item quantity and weight
      const totalQuantity = selectedProducts.reduce(
        (sum, item) => sum + item.qty,
        0
      );
      const estimatedWeight = Math.max(0.5, totalQuantity * 0.3); // Estimate 0.3kg per item, min 0.5kg

      // Build item description
      const itemDescriptions = selectedProducts
        .map((item) => {
          let desc = `${item.product_name_snapshot}`;
          if (item.color_snapshot) desc += ` (${item.color_snapshot})`;
          if (item.size_snapshot) desc += ` - Size: ${item.size_snapshot}`;
          desc += ` - Qty: ${item.qty}, Price: ${
            item.price || item.sell_price_bdt_snapshot
          } BDT`;
          return desc;
        })
        .join("; ");

      // Get store_id from localStorage (set in settings) or environment variable
      const storeId =
        pathaoStoreId || process.env.NEXT_PUBLIC_PATHAO_STORE_ID || "1";

      if (!pathaoStoreId && !process.env.NEXT_PUBLIC_PATHAO_STORE_ID) {
        showToast("Please select a Pathao store in Settings first", "error");
        return;
      }

      // Get selected city, zone, area names
      const selectedCity = cities.find(
        (c) => c.city_id === formData.pathao_city_id
      );
      const selectedZone = zones.find(
        (z) => z.zone_id === formData.pathao_zone_id
      );
      const selectedArea = areas.find(
        (a) => a.area_id === formData.pathao_area_id
      );

      // Build recipient address
      const recipientAddress = `${formData.delivery_address}${
        selectedCity?.city_name ? `, ${selectedCity.city_name}` : ""
      }${selectedZone?.zone_name ? `, ${selectedZone.zone_name}` : ""}${
        selectedArea?.area_name ? `, ${selectedArea.area_name}` : ""
      }`;

      // Call Pathao API
      const response = await fetch("/api/pathao/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: parseInt(storeId),
          merchant_order_id: orderId.toString(),
          recipient_name: customer.name,
          recipient_phone: customer.phone,
          recipient_address: recipientAddress,
          delivery_type: 48, // Standard delivery
          item_type: 2, // Parcel
          special_instruction: "",
          item_quantity: totalQuantity,
          item_weight: estimatedWeight.toFixed(1),
          item_description: itemDescriptions,
          amount_to_collect: due,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Failed to create order in Pathao"
        );
      }

      const pathaoResponse = await response.json();

      // Update order with Pathao tracking information
      if (pathaoResponse.code === 200 && pathaoResponse.data) {
        const trackingCode =
          pathaoResponse.data.consignment_id ||
          pathaoResponse.data.tracking_code ||
          pathaoResponse.data.order_id;
        const pathaoStatus = pathaoResponse.data.status || "pending";

        await ordersAPI.update(orderId, {
          pathao_tracking_code: trackingCode,
          pathao_status: pathaoStatus,
          pathao_city_name:
            selectedCity?.city_name || formData.pathao_district || undefined,
          pathao_zone_name:
            selectedZone?.zone_name || formData.pathao_zone || undefined,
          pathao_area_name:
            selectedArea?.area_name || formData.pathao_area || undefined,
          last_synced_at: new Date().toISOString(),
        });
        // showToast("Order sent to Pathao successfully!", "success");

        // Refresh order data
        const updatedOrder = await ordersAPI.getById(orderId);
        setOrder(updatedOrder);
      } else {
        throw new Error(
          pathaoResponse.message || "Failed to create order in Pathao"
        );
      }
    } catch (err) {
      console.error("Error sending order to Pathao:", err);
    } finally {
      setIsSendingToPathao(false);
    }
  };

  // Filter customers for autocomplete
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(formData.customer_name.toLowerCase())
  );

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

  // Get product variants
  const getProductVariants = (product: Product) => {
    if (!product.variant_groups || !Array.isArray(product.variant_groups)) {
      return { colors: [], sizes: [] };
    }

    const colors = [
      ...new Set(
        product.variant_groups
          .map((vg) => vg.color?.trim())
          .filter((color): color is string =>
            Boolean(color && color.length > 0)
          )
      ),
    ];

    const sizes = [
      ...new Set(
        product.variant_groups
          .flatMap((vg) => vg.sizes || [])
          .map((size) => size?.trim())
          .filter((size): size is string => Boolean(size && size.length > 0))
      ),
    ];

    return { colors, sizes };
  };

  // Handle product selection
  const handleAddProduct = () => {
    const productSelect = document.getElementById(
      "product-select"
    ) as HTMLSelectElement;
    const productId = productSelect?.value;

    if (productId) {
      const product = products.find((p) => p.id === parseInt(productId, 10));
      if (product) {
        const variants = getProductVariants(product);
        const hasVariants =
          variants.colors.length > 0 || variants.sizes.length > 0;

        const newItem: OrderItemForm = {
          product_id: product.id,
          product_name_snapshot: product.name,
          image_url_snapshot: product.image_url || "",
          sell_price_bdt_snapshot: product.sell_price_bdt,
          qty: 1,
          quantity: 1,
          price: product.sell_price_bdt,
          color_snapshot:
            hasVariants && variants.colors.length > 0
              ? variants.colors[0]
              : undefined,
          size_snapshot:
            hasVariants && variants.sizes.length > 0
              ? variants.sizes[0]
              : undefined,
        };

        setSelectedProducts([...selectedProducts, newItem]);
        productSelect.value = "";
      }
    }
  };

  // Handle product removal
  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  // Calculate delivery charge
  const calculateDeliveryCharge = () => {
    if (!formData.delivery_type) return 0;
    return settings.deliveryCharges[formData.delivery_type] || 0;
  };

  // Calculate totals
  const subtotal = selectedProducts.reduce(
    (sum, item) =>
      sum + (item.price || item.sell_price_bdt_snapshot) * item.qty,
    0
  );
  const deliveryCharge = calculateDeliveryCharge();
  const total = subtotal + deliveryCharge;
  const due = total - advanceAmount;

  // Handle form submission
  const handleUpdateOrder = async () => {
    if (!orderId) {
      alert("Order ID is missing");
      return;
    }

    if (
      !formData.customer_name ||
      !formData.customer_phone ||
      !formData.delivery_address
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (selectedProducts.length === 0) {
      alert("Please add at least one product");
      return;
    }

    try {
      setIsSaving(true);

      // Find or create customer
      let customer = customers.find((c) => c.phone === formData.customer_phone);
      if (!customer) {
        customer = await customersAPI.create({
          name: formData.customer_name,
          phone: formData.customer_phone,
          address: formData.delivery_address,
        });
        setCustomers([...customers, customer]);
      }

      // Get selected city, zone, area names
      const selectedCity = cities.find(
        (c) => c.city_id === formData.pathao_city_id
      );
      const selectedZone = zones.find(
        (z) => z.zone_id === formData.pathao_zone_id
      );
      const selectedArea = areas.find(
        (a) => a.area_id === formData.pathao_area_id
      );

      // Prepare order items
      const orderItems = selectedProducts.map((item) => ({
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        image_url_snapshot: item.image_url_snapshot,
        color_snapshot: item.color_snapshot || null,
        size_snapshot: item.size_snapshot || null,
        qty: item.qty,
        sell_price_bdt_snapshot: item.sell_price_bdt_snapshot,
        price: item.price || item.sell_price_bdt_snapshot,
        quantity: item.quantity || item.qty,
      }));

      // Update order using PATCH
      await ordersAPI.update(orderId, {
        customer_id: customer.id,
        address: formData.delivery_address,
        delivery_charge_bdt: deliveryCharge,
        advance_bdt: advanceAmount,
        estimated_delivery_date: estimatedDeliveryDate || undefined,
        pathao_city_name:
          selectedCity?.city_name || formData.pathao_district || undefined,
        pathao_zone_name:
          selectedZone?.zone_name || formData.pathao_zone || undefined,
        pathao_area_name:
          selectedArea?.area_name || formData.pathao_area || undefined,
        items: orderItems.map((item) => ({
          ...item,
          color_snapshot: item.color_snapshot || undefined,
          size_snapshot: item.size_snapshot || undefined,
        })),
      });

      alert("Order updated successfully");
      router.push("/orders");
    } catch (err) {
      console.error("Error updating order:", err);
      alert(
        (err as Error).message || "Failed to update order. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order data...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Button onClick={() => router.push("/orders")} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Update Order #{orderId}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Customer & Delivery */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Customer & Delivery
            </h2>

            <div className="space-y-4">
              {/* Customer Name with Autocomplete */}
              <div className="relative">
                <Input
                  ref={customerInputRef}
                  label="Customer Name"
                  value={formData.customer_name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      customer_name: e.target.value,
                    });
                    setShowCustomerSuggestions(
                      e.target.value.length > 0 && filteredCustomers.length > 0
                    );
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow click
                    setTimeout(() => setShowCustomerSuggestions(false), 200);
                  }}
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
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <p className="font-medium text-gray-900">
                          {customer.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Input
                label="Phone"
                value={formData.customer_phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer_phone: e.target.value,
                  })
                }
                required
              />

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Address
                </label>
                <textarea
                  className="block w-full px-4 py-3 text-base border border-gray-200 rounded-xl transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-300 focus:shadow-lg"
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
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
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
              <div className="space-y-4">
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
                Delivery Type
              </h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="delivery_type"
                    value="inside_dhaka"
                    checked={formData.delivery_type === "inside_dhaka"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery_type: e.target.value as "inside_dhaka",
                      })
                    }
                    className="mr-2"
                  />
                  <span>
                    Inside Dhaka (
                    {formatBDT(settings.deliveryCharges.inside_dhaka)})
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="delivery_type"
                    value="outside_dhaka"
                    checked={formData.delivery_type === "outside_dhaka"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery_type: e.target.value as "outside_dhaka",
                      })
                    }
                    className="mr-2"
                  />
                  <span>
                    Outside Dhaka (
                    {formatBDT(settings.deliveryCharges.outside_dhaka)})
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Input
                label="Advance Amount"
                type="number"
                value={advanceAmount}
                onChange={(e) =>
                  setAdvanceAmount(parseFloat(e.target.value) || 0)
                }
              />
              <Input
                label="Estimated Delivery Date"
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Items */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Order Items
            </h2>

            <div className="space-y-4 mb-4">
              <div className="flex gap-2 items-center">
                <Select
                  id="product-select"
                  className="w-full!"
                  options={[
                    { value: "", label: "Select Product" },
                    ...products.map((product) => ({
                      value: product.id.toString(),
                      label: product.name,
                    })),
                  ]}
                />
                <button
                  onClick={handleAddProduct}
                  className="h-full py-3 items-center px-4 rounded-xl inline-flex bg-blue-600 text-white"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add
                </button>
              </div>

              {selectedProducts.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 border border-gray-200 rounded-lg p-4"
                >
                  <Image
                    src={item.image_url_snapshot || "/placeholder-image.png"}
                    alt={item.product_name_snapshot}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-md object-cover shrink-0"
                  />
                  <div className="grow min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.product_name_snapshot}
                    </p>
                    {(item.color_snapshot || item.size_snapshot) && (
                      <p className="text-sm text-gray-500">
                        {item.color_snapshot && item.size_snapshot
                          ? `${item.color_snapshot} / ${item.size_snapshot}`
                          : item.color_snapshot || item.size_snapshot}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => {
                        const updated = [...selectedProducts];
                        const newQty = parseInt(e.target.value, 10) || 1;
                        updated[index].qty = newQty;
                        updated[index].quantity = newQty;
                        setSelectedProducts(updated);
                      }}
                      min="1"
                      className="w-20"
                    />
                    <div className="text-right min-w-[100px]">
                      <p className="text-sm text-gray-600">
                        {formatBDT(item.price || item.sell_price_bdt_snapshot)}{" "}
                        × {item.qty}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {formatBDT(
                          (item.price || item.sell_price_bdt_snapshot) *
                            item.qty
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Charge:</span>
                <span className="font-medium">{formatBDT(deliveryCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Advance:</span>
                <span className="font-medium text-green-600">
                  -{formatBDT(advanceAmount)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>{formatBDT(total)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-red-600">
                <span>Due:</span>
                <span>{formatBDT(due)}</span>
              </div>
            </div>

            <Button
              onClick={handleUpdateOrder}
              disabled={isSaving}
              className="w-full mt-6"
            >
              {isSaving ? "Updating..." : "Update Order"}
            </Button>
          </div>

          {/* Pathao Panel */}
          <div className="bg-gray-50 p-4 rounded-lg mt-6">
            <h3 className="font-semibold text-gray-800 mb-2">Pathao Details</h3>
            {order?.pathao_tracking_code ? (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tracking Code:</p>
                    <p className="font-mono text-blue-600 font-semibold">
                      {order.pathao_tracking_code}
                    </p>
                  </div>

                  {order.customer_phone && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Pathao Tracking URL:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`https://merchant.pathao.com/tracking?consignment_id=${order.pathao_tracking_code}&phone=${order.customer_phone}`}
                          className="flex-1 text-sm bg-white p-2 rounded-md border border-gray-300 focus:ring-0"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyPathaoTrackingLink}
                        >
                          {isCopiedPathaoTracking ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Pathao Order Information
                    </p>
                    {isLoadingPathaoInfo ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {pathaoOrderInfo?.consignment_id && (
                          <p>
                            <span className="font-medium">Consignment ID:</span>{" "}
                            {pathaoOrderInfo.consignment_id}
                          </p>
                        )}
                        {pathaoOrderInfo?.status && (
                          <p>
                            <span className="font-medium">Status:</span>{" "}
                            {pathaoOrderInfo.status}
                          </p>
                        )}
                        {pathaoOrderInfo?.delivery_status && (
                          <p>
                            <span className="font-medium">
                              Delivery Status:
                            </span>{" "}
                            {pathaoOrderInfo.delivery_status}
                          </p>
                        )}
                        {pathaoOrderInfo?.amount_to_collect && (
                          <p>
                            <span className="font-medium">
                              Amount to Collect:
                            </span>{" "}
                            {formatBDT(pathaoOrderInfo.amount_to_collect)}
                          </p>
                        )}
                        {pathaoOrderInfo?.delivery_charge && (
                          <p>
                            <span className="font-medium">
                              Delivery Charge:
                            </span>{" "}
                            {formatBDT(pathaoOrderInfo.delivery_charge)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  This order has not been sent to Pathao yet.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSendToPathao}
                  disabled={isSendingToPathao}
                >
                  {isSendingToPathao ? "Sending..." : "Send to Pathao"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
