/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, StatusChip } from "@/components/ui";
import useStore from "@/store";
// import { showToast } from '@/utils';
import { formatDate, formatBDT } from "@/components/utils";
import { ArrowLeft, Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { OrderItem } from "@/types";

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { batches, orders, products } = useStore();

  const [analytics, setAnalytics] = useState({
    totalBuying: 0,
    totalSelling: 0,
    totalProfit: 0,
  });

  // Guard against SSR and ensure params exists
  if (!params || !params.id) {
    return null;
  }

  const batchId = parseInt(params.id as string);
  const batch = batches.find((b) => b.id === batchId);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!batch) {
      alert("Batch not found");
      router.push("/batches");
      return;
    }

    const batchOrders = orders.filter((order) =>
      batch.order_ids.includes(order.id)
    );
    const totals = batchOrders.reduce(
      (acc, order) => {
        const orderItems = order.items.map((item: OrderItem) => {
          const product = products.find((p) => p.id === item.product_id);
          return {
            buying: (product?.buying_price || 0) * item.quantity,
            selling: item.price * item.quantity,
          };
        });

        const orderBuying = orderItems.reduce(
          (sum, item) => sum + item.buying,
          0
        );
        const orderSelling = orderItems.reduce(
          (sum, item) => sum + item.selling,
          0
        );

        return {
          totalBuying: acc.totalBuying + orderBuying,
          totalSelling: acc.totalSelling + orderSelling,
          totalProfit: acc.totalProfit + (orderSelling - orderBuying),
        };
      },
      {
        totalBuying: 0,
        totalSelling: 0,
        totalProfit: 0,
      }
    );

    setAnalytics(totals);
  }, [batch, orders, products, router]);

  if (!batch) return null;

  const batchOrders = orders.filter((order) =>
    batch.order_ids.includes(order.id)
  );

  const handleExportXLSX = () => {
    // Agent Order Summary Sheet
    const summaryData = batchOrders.map((order) => ({
      "Order ID": order.id,
      "Customer Name": order.customer_name,
      Phone: order.customer_phone,
      Address: order.delivery_address,
      "Total Amount": order.total_amount,
      Status: order.status,
      "Created At": formatDate(order.created_at),
    }));

    // Variant Details Sheet
    const variantData = batchOrders.flatMap((order) =>
      order.items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        return {
          "Order ID": order.id,
          "Product Code": product?.code || "",
          "Product Name": product?.name || "",
          Quantity: item.quantity,
          "Unit Price": item.price,
          "Total Price": item.price * item.quantity,
        };
      })
    );

    // README Sheet
    const readmeData = [
      ["Batch Analytics"],
      ["Total Buying", analytics.totalBuying],
      ["Total Selling", analytics.totalSelling],
      ["Total Profit", analytics.totalProfit],
      [],
      ["Generated at", new Date().toLocaleString()],
    ];

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "Agent_Order_Summary");

    const ws2 = XLSX.utils.json_to_sheet(variantData);
    XLSX.utils.book_append_sheet(wb, ws2, "Variant_Details");

    const ws3 = XLSX.utils.aoa_to_sheet(readmeData);
    XLSX.utils.book_append_sheet(wb, ws3, "ReadMe");

    XLSX.writeFile(wb, `Batch_${batch.id}_Export.xlsx`);
    alert("Batch exported successfully");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/batches")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Batch #{batch.id}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExportXLSX}>
            <Download className="w-4 h-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-semibold">{batch.order_ids.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Buying</div>
          <div className="text-2xl font-semibold">
            {formatBDT(analytics.totalBuying)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Selling</div>
          <div className="text-2xl font-semibold">
            {formatBDT(analytics.totalSelling)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Profit</div>
          <div className="text-2xl font-semibold text-green-600">
            {formatBDT(analytics.totalProfit)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Orders in this Batch</h2>
          <p className="text-sm text-gray-500 mt-1">{batch.note}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batchOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/orders?id=${order.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customer_phone}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                    {order.delivery_address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatBDT(order.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusChip status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
