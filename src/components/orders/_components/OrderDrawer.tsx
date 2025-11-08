/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button, StatusChip, Textarea } from "@/components/ui";
import {
  getOrders,
  getCustomers,
  setOrders,
  setCustomers,
} from "@/utils/local-storage";
import { ordersAPI, customersAPI } from "@/utils/api-client";
import {
  formatDate,
  formatBDT,
  copyToClipboard,
  callGeminiAPI,
  showToast,
} from "@/components/utils";
import { X, FilePenLine, Copy, Check } from "lucide-react";
import { Customer, Order } from "@/types";
import Image from "next/image";
import { getValidPathaoToken } from "@/utils/pathao-token";
import { useAuth } from "@/contexts";
interface OrderDrawerProps {
  orderId: number;
  onClose: () => void;
}

export default function OrderDrawer({ orderId, onClose }: OrderDrawerProps) {
  const router = useRouter();
  const { pathaoStoreId } = useAuth();
  const [orders, setOrdersState] = useState(getOrders());
  const [customers, setCustomersState] = useState(getCustomers());

  // Fetch orders and customers from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordersData = await ordersAPI.getAll();
        setOrders(ordersData);
        setOrdersState(ordersData);

        const customersData = await customersAPI.getAll();
        setCustomers(customersData);
        setCustomersState(customersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedPathaoTracking, setIsCopiedPathaoTracking] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isSendingToPathao, setIsSendingToPathao] = useState(false);
  const [pathaoOrderInfo, setPathaoOrderInfo] = useState<any>(null);
  const [isLoadingPathaoInfo, setIsLoadingPathaoInfo] = useState(false);

  const order = orders.find((o: Order) => o.id === orderId);
  if (!order) return null;

  const customer = customers.find((c: Customer) => c.id === order.customer_id);
  if (!customer) return null;

  const subtotal = order.items.reduce(
    (sum: number, item: any) => sum + item.sell_price_bdt_snapshot * item.qty,
    0
  );
  const trackingLink = `${window.location.origin}/track/${order.id}`;
  const pathaoTrackingUrl = order.pathao_tracking_code
    ? `https://merchant.pathao.com/tracking?consignment_id=${order.pathao_tracking_code}&phone=${customer.phone}`
    : null;

  // Fetch Pathao order info when drawer opens
  useEffect(() => {
    const fetchPathaoOrderInfo = async () => {
      if (!order.pathao_tracking_code) {
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
            // Update order status if available
            if (data.data.status) {
              await ordersAPI.update(order.id, {
                pathao_status: data.data.status,
                last_synced_at: new Date().toISOString(),
              });
              // Refresh orders
              const updatedOrders = await ordersAPI.getAll();
              setOrders(updatedOrders);
              setOrdersState(updatedOrders);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching Pathao order info:", error);
      } finally {
        setIsLoadingPathaoInfo(false);
      }
    };

    fetchPathaoOrderInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.pathao_tracking_code]);

  const handleCopyPathaoTrackingLink = async () => {
    if (!pathaoTrackingUrl) return;
    try {
      await copyToClipboard(pathaoTrackingUrl);
      setIsCopiedPathaoTracking(true);
      showToast("Pathao tracking link copied to clipboard!", "success");
      setTimeout(() => setIsCopiedPathaoTracking(false), 2000);
    } catch (error) {
      showToast("Failed to copy link", "error");
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(trackingLink);
      setIsCopied(true);
      showToast("Tracking link copied to clipboard!", "success");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      showToast("Failed to copy link", "error");
    }
  };

  const handleEditOrder = () => {
    router.push(`/update-order/${order.id}`);
    onClose();
  };

  const handleSuggestMessage = async () => {
    setIsGeneratingMessage(true);
    try {
      const prompt = `Generate a friendly customer follow-up message for an order with status "${
        order.status
      }". The customer is ${customer.name}. The order ID is ${order.id}. ${
        order.pathao_tracking_code
          ? `The Pathao tracking code is ${order.pathao_tracking_code}.`
          : ""
      }`;
      const message = await callGeminiAPI(prompt);
      const personalizedMessage = message
        .replace("[Customer Name]", customer.name)
        .replace("[Order ID]", order.id.toString());

      const textarea = document.getElementById(
        "customer-comm-message"
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = personalizedMessage;
      }
    } catch (error) {
      showToast("Failed to generate message", "error");
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleSendToPathao = async () => {
    if (
      !order.pathao_city_name ||
      !order.pathao_zone_name ||
      !order.pathao_area_name
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

      // Calculate total item quantity and weight
      const totalQuantity = order.items.reduce(
        (sum: number, item: any) => sum + item.qty,
        0
      );
      const estimatedWeight = Math.max(0.5, totalQuantity * 0.3); // Estimate 0.3kg per item, min 0.5kg

      // Build item description
      const itemDescriptions = order.items
        .map((item: any) => {
          let desc = `${item.product_name_snapshot}`;
          if (item.color_snapshot) desc += ` (${item.color_snapshot})`;
          if (item.size_snapshot) desc += ` - Size: ${item.size_snapshot}`;
          desc += ` - Qty: ${item.qty}, Price: ${item.sell_price_bdt_snapshot} BDT`;
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

      // Build recipient address
      const recipientAddress = `${order.address}${
        order.pathao_city_name ? `, ${order.pathao_city_name}` : ""
      }${order.pathao_zone_name ? `, ${order.pathao_zone_name}` : ""}${
        order.pathao_area_name ? `, ${order.pathao_area_name}` : ""
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
          merchant_order_id: order.id.toString(),
          recipient_name: customer.name,
          recipient_phone: customer.phone,
          recipient_address: recipientAddress,
          delivery_type: 48, // Standard delivery - you may need to adjust based on Pathao API docs
          item_type: 2, // Parcel - you may need to adjust based on Pathao API docs
          special_instruction: "",
          item_quantity: totalQuantity,
          item_weight: estimatedWeight.toFixed(1),
          item_description: itemDescriptions,
          amount_to_collect: order.due_bdt,
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

        await ordersAPI.update(order.id, {
          pathao_tracking_code: trackingCode,
          pathao_status: pathaoStatus,
          last_synced_at: new Date().toISOString(),
        });

        showToast("Order sent to Pathao successfully!", "success");
        // Refresh orders
        const updatedOrders = await ordersAPI.getAll();
        setOrders(updatedOrders);
        setOrdersState(updatedOrders);
      } else {
        throw new Error(
          pathaoResponse.message || "Failed to create order in Pathao"
        );
      }
    } catch (error: any) {
      console.error("Error sending order to Pathao:", error);
      showToast(
        error.message || "Failed to send order to Pathao. Please try again.",
        "error"
      );
    } finally {
      setIsSendingToPathao(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Order #{order.id}
              </h2>
              <p className="text-sm text-gray-500">
                Created on {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status={order.status} />
              <Button variant="ghost" size="sm" onClick={handleEditOrder}>
                <FilePenLine className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-grow">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Customer</h3>
                <p className="font-medium">{customer.name}</p>
                <p className="text-gray-600">{customer.phone}</p>
                <p className="text-gray-600">{order.address}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Delivery</h3>
                <p className="text-gray-600">
                  {order.pathao_city_name}, {order.pathao_zone_name},{" "}
                  {order.pathao_area_name}
                </p>
                <p className="font-medium">
                  Charge: {formatBDT(order.delivery_charge_bdt)}
                </p>
              </div>
            </div>

            {/* Tracking Link */}
            <div className="bg-gray-50 hidden p-3 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">
                Customer Tracking Link
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={trackingLink}
                  className="w-full text-sm bg-gray-200 p-2 rounded-md border-transparent focus:ring-0"
                />
                <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                  {isCopied ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Items */}
            <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
            <div className="space-y-2 border-t border-b py-2 mb-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-4">
                  <Image
                    src={item.image_url_snapshot}
                    alt={item.product_name_snapshot}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-md object-cover"
                  />
                  <div className="flex-grow">
                    <p className="font-medium">{item.product_name_snapshot}</p>
                    {item.color_snapshot && item.size_snapshot && (
                      <p className="text-sm text-gray-500">
                        {item.color_snapshot} / {item.size_snapshot}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p>
                      {formatBDT(item.sell_price_bdt_snapshot)} × {item.qty}
                    </p>
                    <p className="font-semibold">
                      {formatBDT(item.sell_price_bdt_snapshot * item.qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-1 text-right mb-6">
              <p>
                Subtotal:{" "}
                <span className="font-medium">{formatBDT(subtotal)}</span>
              </p>
              <p>
                Delivery:{" "}
                <span className="font-medium">
                  {formatBDT(order.delivery_charge_bdt)}
                </span>
              </p>
              <p>
                Advance:{" "}
                <span className="font-medium text-green-600">
                  -{formatBDT(order.advance_bdt)}
                </span>
              </p>
              <p className="text-xl font-bold text-red-600">
                Due: <span>{formatBDT(order.due_bdt)}</span>
              </p>
            </div>

            {/* Pathao Panel */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">
                Pathao Details
              </h3>
              {order.pathao_tracking_code ? (
                <>
                  <p>
                    Tracking:{" "}
                    <span className="font-mono text-blue-600">
                      {order.pathao_tracking_code}
                    </span>
                  </p>
                  <p>
                    Status:{" "}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {order.pathao_status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last synced: {formatDate(order.last_synced_at || "")}
                  </p>
                  <div className="mt-3">
                    <Button size="sm">Sync Status</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600">
                    This order has not been sent to Pathao yet.
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSendToPathao}
                      loading={isSendingToPathao}
                      disabled={isSendingToPathao}
                    >
                      Send to Pathao
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Customer Communication */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                Customer Communication
              </h3>
              <Textarea
                id="customer-comm-message"
                rows={4}
                className="mb-2"
                placeholder="Draft a message for the customer..."
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSuggestMessage}
                  loading={isGeneratingMessage}
                >
                  ✨ Suggest Follow-up Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
