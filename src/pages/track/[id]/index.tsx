/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import { Order } from "@/types";
import React from "react";
import {
  CheckCircle2,
  Circle,
  Package,
  Truck,
  MapPin,
  SearchX,
} from "lucide-react";
import { formatBDT, formatDate } from "@/components/utils";
import { ordersAPI } from "@/utils/api-client";
import { getSettings } from "@/utils/local-storage";

// Force server-side rendering to avoid static generation issues
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

export default function TrackingPage() {
  const router = useRouter();
  const orderIdParam = router.query.id;
  const orderId =
    typeof orderIdParam === "string" ? parseInt(orderIdParam) : null;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(() => getSettings());

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const orderData = await ordersAPI.getById(orderId);
        setOrder(orderData);
      } catch (error) {
        console.error("Error fetching order:", error);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Loading...
          </h1>
          <p className="text-gray-600">
            Please wait while we load the order details.
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <SearchX className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Order Not Found</h2>
          <p className="text-gray-500 mt-2">
            We couldn&#39;t find an order with the ID #{orderId}. Please check
            the link and try again.
          </p>
        </div>
      </div>
    );
  }

  // Statuses matching the HTML file exactly
  const statuses = [
    "Pending",
    "Processing",
    "Packing",
    "InTransit",
    "Delivered",
  ];

  // Map database status to HTML status format for timeline
  const mapDbStatusToHtmlStatus = (dbStatus: string): string => {
    const statusMap: Record<string, string> = {
      pending: "Pending",
      confirmed: "Processing",
      processing: "Packing",
      shipped: "InTransit",
      delivered: "Delivered",
    };
    return statusMap[dbStatus] || "Pending";
  };

  // Get the current status in HTML format and find its index
  const htmlStatus = mapDbStatusToHtmlStatus(order.status);
  const currentStatusIndex = statuses.indexOf(htmlStatus);

  const estimatedDelivery = order.estimated_delivery_date
    ? formatDate(order.estimated_delivery_date)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Tracking Order #{order.id}
          </h2>
          {estimatedDelivery && (
            <p className="text-lg text-gray-500 mt-2">
              Estimated Delivery:{" "}
              <span className="font-semibold text-gray-700">
                {estimatedDelivery}
              </span>
            </p>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center">
            {statuses.map((status, index) => {
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              // Step circle color logic
              const circleColor = isCompleted
                ? "bg-green-500 border-green-500"
                : isCurrent
                ? "bg-blue-500 border-blue-500"
                : "bg-gray-200 border-gray-300";

              // Step text color logic
              const textColor = isCompleted
                ? "text-green-700"
                : isCurrent
                ? "text-blue-700"
                : "text-gray-400";

              // Icon color
              const iconColor =
                isCompleted || isCurrent ? "text-white" : "text-gray-400";

              return (
                <React.Fragment key={status}>
                  <div className="flex flex-col items-center min-w-0">
                    <div
                      className={`w-9 h-9 relative flex items-center justify-center rounded-full border-4 ${circleColor} transition-colors duration-300}
                      `}
                    >
                      {isCompleted || isCurrent ? (
                        <>
                          <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />
                          {isCurrent && (
                            <span className="absolute top-0 right-0 w-full h-full bg-blue-500 animate-ping rounded-full" />
                          )}
                        </>
                      ) : (
                        <span className="w-3 h-3 bg-gray-400 rounded-full" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-bold sm:text-sm text-center ${textColor}`}
                    >
                      {status}
                    </span>
                  </div>
                  {index < statuses.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 sm:mx-3 mb-6
                        ${
                          index < currentStatusIndex
                            ? "bg-green-500"
                            : index === currentStatusIndex
                            ? "bg-gradient-to-r from-green-500 to-gray-300"
                            : "bg-gray-300"
                        }
                      `}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Items in your order
          </h3>
          <div className="space-y-4">
            {order.items.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4">
                {item.image_url_snapshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url_snapshot}
                    alt={item.product_name_snapshot}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {item.product_name_snapshot}
                  </p>
                  {(item.color_snapshot || item.size_snapshot) && (
                    <p className="text-sm text-gray-500">
                      {item.color_snapshot || ""}
                      {item.color_snapshot && item.size_snapshot ? " / " : ""}
                      {item.size_snapshot || ""}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Quantity: {item.qty || item.quantity || 1}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">
                    {formatBDT(
                      (item.sell_price_bdt_snapshot || item.price || 0) *
                        (item.qty || item.quantity || 1)
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Customer Name
                </h3>
                <p className="mt-1 font-medium">{order.customer_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="mt-1 font-medium">{order.customer_phone}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Delivery Address
              </h3>
              <p className="mt-1">{order.delivery_address}</p>
            </div>

            {order.pathao_tracking_code && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Pathao Tracking
                </h3>
                <p className="font-mono text-blue-600">
                  {order.pathao_tracking_code}
                </p>
                {order.pathao_status && (
                  <p className="text-sm text-gray-600 mt-1">
                    Status: {order.pathao_status}
                  </p>
                )}
              </div>
            )}

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium">
                    {formatBDT(
                      (order.total_amount || 0) -
                        (order.delivery_charge_bdt ||
                          order.delivery_charge ||
                          0)
                    )}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-500">Delivery Charge</p>
                  <p className="font-medium">
                    {formatBDT(
                      order.delivery_charge_bdt || order.delivery_charge || 0
                    )}
                  </p>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <p>Total</p>
                  <p>{formatBDT(order.total_amount || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p className="mt-6">
            Powered by{" "}
            <span className="font-semibold">
              {settings.appName || "Dashboard"}
            </span>
          </p>
          <p className="mt-2">Need help? Contact us:</p>
          <p className="mt-1">
            {settings.support_phone && `Phone: ${settings.support_phone}`}
            {settings.support_phone && settings.support_email && " | "}
            {settings.support_email && `Email: ${settings.support_email}`}
          </p>
          <p className="mt-4">
            &copy; {new Date().getFullYear()}{" "}
            {settings.company_name || "Company"}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
