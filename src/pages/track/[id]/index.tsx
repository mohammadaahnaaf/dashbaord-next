/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import useStore from "@/store";
import { Order, Product } from "@/types";
import { CheckCircle2, Circle, Package, Truck, MapPin } from "lucide-react";
import { formatBDT, formatDate } from "@/components/utils";

// Force server-side rendering to avoid static generation issues with Zustand store
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

  const orders = useStore((state) => state.orders);
  const products = useStore((state) => state.products);
  const settings = useStore((state) => state.settings);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId && orders && orders.length > 0) {
      const foundOrder = orders.find((o: Order) => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
      }
    }
  }, [orderId, orders]);

  if (!order || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {!order ? "Order Not Found" : "Loading..."}
          </h1>
          <p className="text-gray-600">
            {!order
              ? "The order you are looking for does not exist."
              : "Please wait while we load the order details."}
          </p>
        </div>
      </div>
    );
  }

  const getOrderItems = () => {
    if (!order || !order.items || !products) return [];
    return order.items.map((item: any) => {
      const product = products.find((p: Product) => p.id === item.product_id);
      return {
        ...item,
        product_name: product?.name || "Unknown Product",
        total: (item.sell_price_bdt_snapshot || 0) * (item.qty || 0),
        quantity: item.qty || 0,
        price: item.sell_price_bdt_snapshot || 0,
      };
    });
  };

  const getStatusStep = () => {
    switch (order.status) {
      case "pending":
        return 0;
      case "confirmed":
        return 1;
      case "processing":
        return 2;
      case "shipped":
        return 3;
      case "delivered":
        return 4;
      default:
        return 0;
    }
  };

  const statusStep = getStatusStep();
  const orderItems = getOrderItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Order #{order.id}
            </h1>
            <p className="text-gray-600">Track your order status</p>
          </div>

          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-px bg-gray-200 left-1/2"></div>

            <div className="space-y-8">
              <div
                className={`relative flex items-center ${
                  statusStep >= 0 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div className="flex-1 text-right pr-4">
                  <h3 className="font-medium">Order Placed</h3>
                  <p className="text-sm">{formatDate(order.created_at)}</p>
                </div>
                <div className="z-10 bg-white">
                  {statusStep >= 0 ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 pl-4"></div>
              </div>

              <div
                className={`relative flex items-center ${
                  statusStep >= 1 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div className="flex-1 text-right pr-4"></div>
                <div className="z-10 bg-white">
                  {statusStep >= 1 ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 pl-4">
                  <h3 className="font-medium">Order Confirmed</h3>
                  <p className="text-sm">We have confirmed your order</p>
                </div>
              </div>

              <div
                className={`relative flex items-center ${
                  statusStep >= 2 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div className="flex-1 text-right pr-4">
                  <h3 className="font-medium">Processing</h3>
                  <p className="text-sm">Your order is being processed</p>
                </div>
                <div className="z-10 bg-white">
                  {statusStep >= 2 ? (
                    <Package className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 pl-4"></div>
              </div>

              <div
                className={`relative flex items-center ${
                  statusStep >= 3 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div className="flex-1 text-right pr-4"></div>
                <div className="z-10 bg-white">
                  {statusStep >= 3 ? (
                    <Truck className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 pl-4">
                  <h3 className="font-medium">Shipped</h3>
                  <p className="text-sm">Your order is on the way</p>
                </div>
              </div>

              <div
                className={`relative flex items-center ${
                  statusStep >= 4 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div className="flex-1 text-right pr-4">
                  <h3 className="font-medium">Delivered</h3>
                  <p className="text-sm">Order has been delivered</p>
                </div>
                <div className="z-10 bg-white">
                  {statusStep >= 4 ? (
                    <MapPin className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 pl-4"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Customer Name
                </h3>
                <p className="mt-1">{order.customer_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="mt-1">{order.customer_phone}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Delivery Address
              </h3>
              <p className="mt-1">{order.delivery_address}</p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Order Items
              </h3>
              <div className="space-y-2">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} x {formatBDT(item.price)}
                      </p>
                    </div>
                    <p className="font-medium">{formatBDT(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-500">Subtotal</p>
                  <p>{formatBDT(order.total_amount - order.delivery_charge)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-500">Delivery Charge</p>
                  <p>{formatBDT(order.delivery_charge)}</p>
                </div>
                <div className="flex justify-between font-medium">
                  <p>Total</p>
                  <p>{formatBDT(order.total_amount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Need help? Contact us:</p>
          <p className="mt-1">
            Phone: {settings.support_phone} | Email: {settings.support_email}
          </p>
          <p className="mt-4">
            &copy; {new Date().getFullYear()} {settings.company_name}. All
            rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
