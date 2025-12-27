/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, StatusChip } from "@/components/ui";
import useStore from "@/store";
// import { showToast } from '@/utils';
import { formatDate, formatBDT } from "@/components/utils";
import { ArrowLeft, Download, Printer, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { OrderItem } from "@/types";
import { batchesAPI } from "@/utils/api-client";

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { batches, orders, products } = useStore();
  const fetchBatches = useStore((state) => state.fetchBatches);
  const fetchOrders = useStore((state) => state.fetchOrders);
  const [isAddingOrders, setIsAddingOrders] = useState(false);

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

  // Fetch fresh data on mount
  useEffect(() => {
    if (fetchBatches) fetchBatches();
    if (fetchOrders) fetchOrders();
  }, [fetchBatches, fetchOrders]);

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
    // Get all items from all orders in the batch
    const allItems = batchOrders.flatMap((order) => order.items);

    // --- 1. Prepare data for Agent_Order_Summary sheet ---
    // Group items by product_id and aggregate variants
    const productSummary = allItems.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        const product = products.find((p) => p.id === item.product_id);
        acc[item.product_id] = {
          product: product,
          totalQty: 0,
          variants: {} as Record<string, number>, // e.g., { "Red 41": 2, "Red 42": 1 }
        };
      }

      acc[item.product_id].totalQty += item.qty || item.quantity || 0;
      const variantKey = `${item.color_snapshot || ""} ${item.size_snapshot || ""}`.trim();
      if (variantKey) {
        acc[item.product_id].variants[variantKey] =
          (acc[item.product_id].variants[variantKey] || 0) +
          (item.qty || item.quantity || 0);
      }

      return acc;
    }, {} as Record<number, { product: any; totalQty: number; variants: Record<string, number> }>);

    const summarySheetData = Object.values(productSummary).map((summary) => {
      const variantsSummaryString = Object.entries(summary.variants)
        .map(([variant, qty]) => `${variant}×${qty}`)
        .join("; ");

      return {
        BatchID: batch.id,
        ProductID: summary.product?.id || "",
        ProductName: summary.product?.name || "",
        ProductLink: summary.product?.source_link || summary.product?.sourceLink || "",
        ImageURL: summary.product?.image_url || summary.product?.imageUrl || "",
        VariantsSummary: variantsSummaryString,
        TotalQty: summary.totalQty,
        "PricePerUnit_CNY (Agent)": "",
        "Seller→Agent_Ship_CNY (Agent)": "",
        Subtotal_CNY: "",
        TotalCost_CNY: "",
        TotalCost_BDT: "",
        Notes: "",
      };
    });

    // --- 2. Prepare data for Variant_Details sheet ---
    // Group items by product_id + color + size
    const variantDetails = allItems.reduce((acc, item) => {
      const key = `${item.product_id}-${item.color_snapshot || ""}-${item.size_snapshot || ""}`;
      if (!acc[key]) {
        acc[key] = {
          BatchID: batch.id,
          ProductID: item.product_id,
          ProductName: item.product_name_snapshot,
          Color: item.color_snapshot || "",
          Size: item.size_snapshot || "",
          Qty: 0,
          ImageURL: item.image_url_snapshot || "",
        };
      }
      acc[key].Qty += item.qty || item.quantity || 0;
      return acc;
    }, {} as Record<string, any>);

    const variantSheetData = Object.values(variantDetails);

    // --- 3. Prepare data for ReadMe sheet ---
    const readMeSheetData = [
      ["How to use:"],
      ["1) Agent_Order_Summary = one row per product (all variants grouped)."],
      [
        "   - Agent fills: PricePerUnit_CNY and Seller→Agent_Ship_CNY.",
      ],
      [
        "   - Subtotal/Total in CNY and BDT are auto-calculated (formulas need to be set up in Excel).",
      ],
      ["2) Variant_Details = per-variant breakdown used for packing/verification."],
      [],
      ["CNY_to_BDT_Rate", 15.0], // Default Rate
    ];

    // --- 4. Use SheetJS to create and download the multi-sheet XLSX file ---
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    const wsVariants = XLSX.utils.json_to_sheet(variantSheetData);
    const wsReadMe = XLSX.utils.aoa_to_sheet(readMeSheetData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Agent_Order_Summary");
    XLSX.utils.book_append_sheet(wb, wsVariants, "Variant_Details");
    XLSX.utils.book_append_sheet(wb, wsReadMe, "ReadMe");

    XLSX.writeFile(wb, `Batch_${batch.id}_Agent_Order_List.xlsx`);
    alert("Batch exported successfully");
  };

  const handleAddAllUnbatchedOrders = async () => {
    if (isAddingOrders) return;

    try {
      setIsAddingOrders(true);

      // Get all order IDs that are not in any batch
      const allBatchedOrderIds = batches.flatMap((b) => b.order_ids || []);
      const unbatchedOrderIds = orders
        .filter((order) => !allBatchedOrderIds.includes(order.id))
        .map((order) => order.id);

      if (unbatchedOrderIds.length === 0) {
        alert("All orders are already in batches");
        return;
      }

      // Merge existing order IDs with new ones
      const updatedOrderIds = [
        ...new Set([...(batch.order_ids || []), ...unbatchedOrderIds]),
      ];

      // Call API to update the batch
      await batchesAPI.update(batch.id, {
        order_ids: updatedOrderIds,
      });

      // Refresh batches and orders from API
      if (fetchBatches) {
        await fetchBatches();
      }
      if (fetchOrders) {
        await fetchOrders();
      }

      alert(
        `Added ${unbatchedOrderIds.length} unbatched orders to Batch #${batch.id}`
      );
    } catch (error) {
      console.error("Error adding orders to batch:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to add orders to batch. Please try again."
      );
    } finally {
      setIsAddingOrders(false);
    }
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
          <Button
            variant="secondary"
            onClick={handleAddAllUnbatchedOrders}
            loading={isAddingOrders}
            disabled={isAddingOrders}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add All Unbatched Orders
          </Button>
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
