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
import {
  X,
  FilePenLine,
  Copy,
  Check,
  User,
  Phone,
  MapPin,
  Share2,
  Truck,
  Package,
} from "lucide-react";
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
  const trackingLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/track/${order.id}`
      : `track/${order.id}`;
  const pathaoTrackingUrl = order.pathao_tracking_code
    ? `https://merchant.pathao.com/tracking?consignment_id=${order.pathao_tracking_code}&phone=${customer.phone}`
    : null;
  const totalQuantity = order.items.reduce(
    (sum: number, item: any) => sum + item.qty,
    0
  );

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
      const totalQuantityForShipment = order.items.reduce(
        (sum: number, item: any) => sum + item.qty,
        0
      );
      const estimatedWeight = Math.max(0.5, totalQuantityForShipment * 0.3); // Estimate 0.3kg per item, min 0.5kg

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
          item_quantity: totalQuantityForShipment,
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
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 shadow-2xl">
        <div className="flex h-full flex-col bg-white border-l border-slate-200">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-end gap-3">
                    <h2 className="text-4xl font-semibold tracking-tight">
                      Order #{order.id}
                    </h2>
                  </div>
                  <p className="text-white/80 text-sm">
                    {order.items.length} items · {totalQuantity} units ·{" "}
                    {formatBDT(subtotal)}
                    <span className="text-white/80 text-sm ml-2">
                      Created {formatDate(order.created_at)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <StatusChip status={order.status} />
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditOrder}
                      className="text-white hover:bg-white/20"
                    >
                      <FilePenLine className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-white hover:bg-white/20"
                    >
                      <X className="w-5 h-5" />
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer + Delivery */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="rounded-2xl bg-blue-50 text-blue-600 p-3">
                    <User className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Customer
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {customer.name}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {customer.phone}
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    {order.address}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-slate-100 text-slate-600 p-3">
                    <Truck className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Delivery
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {order.pathao_city_name || "City"} •{" "}
                      {order.pathao_zone_name || "Zone"} •{" "}
                      {order.pathao_area_name || "Area"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 p-3 bg-slate-50">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Delivery charge
                    <p className="text-lg font-semibold text-slate-900">
                      {formatBDT(order.delivery_charge_bdt)}
                    </p>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-400 text-right">
                    Advance paid
                    <p className="text-lg font-semibold text-emerald-600">
                      {formatBDT(order.advance_bdt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking link */}
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white/90 p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-600">
                    Customer tracking link
                  </p>
                  <p className="text-sm text-slate-500">
                    Share this link so your customer can follow their delivery.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-2"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  {isCopied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <div className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-mono text-slate-700 overflow-x-auto">
                {trackingLink}
              </div>
            </div>

            {/* Items + summary */}
            <div className="grid gap-4 lg:grid-cols-1">
              <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    Items ({order.items.length})
                  </h3>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {totalQuantity} units
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {order.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="relative">
                        <Image
                          src={item.image_url_snapshot}
                          alt={item.product_name_snapshot}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200"
                        />
                        <span className="absolute -top-1 -right-1 rounded-full bg-slate-900 text-white text-[10px] px-1.5 py-0.5">
                          ×{item.qty}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium text-slate-900">
                          {item.product_name_snapshot}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {item.color_snapshot || "—"} /{" "}
                          {item.size_snapshot || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          {formatBDT(item.sell_price_bdt_snapshot)}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {formatBDT(item.sell_price_bdt_snapshot * item.qty)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-amber-50 text-gray-600 shadow-lg p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Payment summary
                  </p>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatBDT(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold">
                      {formatBDT(order.delivery_charge_bdt)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-300">
                    <span>Advance</span>
                    <span className="font-semibold">
                      -{formatBDT(order.advance_bdt)}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-100 p-4 text-center mt-auto">
                  <p className="text-xs uppercase tracking-wide text-gray-600">
                    Due amount
                  </p>
                  <p className="text-3xl font-semibold">
                    {formatBDT(order.due_bdt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Pathao Panel */}
            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Pathao details
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {order.pathao_tracking_code ? "In transit" : "Not sent"}
                    </p>
                  </div>
                  <Truck className="w-8 h-8 text-slate-300" />
                </div>

                {order.pathao_tracking_code ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Tracking code
                      </p>
                      <p className="font-mono text-lg text-blue-600">
                        {order.pathao_tracking_code}
                      </p>
                    </div>

                    {pathaoTrackingUrl && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                          Tracking URL
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={pathaoTrackingUrl}
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyPathaoTrackingLink}
                            className="gap-1"
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

                    <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Status
                      </span>
                      {order.pathao_status || "Pending"}
                    </div>

                    {pathaoOrderInfo && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                          Live insights
                        </p>
                        {isLoadingPathaoInfo ? (
                          <p className="text-sm text-slate-500">Loading…</p>
                        ) : (
                          <div className="space-y-1 text-sm text-slate-600">
                            {pathaoOrderInfo.consignment_id && (
                              <p>
                                <span className="font-medium">
                                  Consignment:
                                </span>{" "}
                                {pathaoOrderInfo.consignment_id}
                              </p>
                            )}
                            {pathaoOrderInfo.delivery_status && (
                              <p>
                                <span className="font-medium">
                                  Delivery status:
                                </span>{" "}
                                {pathaoOrderInfo.delivery_status}
                              </p>
                            )}
                            {pathaoOrderInfo.amount_to_collect && (
                              <p>
                                <span className="font-medium">
                                  Amount to collect:
                                </span>{" "}
                                {formatBDT(pathaoOrderInfo.amount_to_collect)}
                              </p>
                            )}
                            {pathaoOrderInfo.delivery_charge && (
                              <p>
                                <span className="font-medium">
                                  Delivery charge:
                                </span>{" "}
                                {formatBDT(pathaoOrderInfo.delivery_charge)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-400">
                      Last synced: {formatDate(order.last_synced_at || "")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 text-slate-600">
                    <p>
                      This order has not been pushed to Pathao yet. Confirm the
                      delivery details above before sending.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSendToPathao}
                      loading={isSendingToPathao}
                      disabled={isSendingToPathao}
                      className="w-full"
                    >
                      Send to Pathao
                    </Button>
                  </div>
                )}
              </div>

              {/* Customer Communication */}
              <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Customer communication
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      Personalize your follow-up
                    </p>
                  </div>
                </div>
                <Textarea
                  id="customer-comm-message"
                  rows={4}
                  className="mb-3 border-slate-200 bg-white/80"
                  placeholder="Draft a friendly update for your customer..."
                />
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSuggestMessage}
                    loading={isGeneratingMessage}
                    className="gap-2"
                  >
                    ✨ Suggest follow-up
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
