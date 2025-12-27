"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { useAuth } from "@/contexts";
import { callGeminiAPI } from "@/components/utils";
import { Plus, Search, ArrowRight, Sparkles, Package } from "lucide-react";
import { formatDate, formatBDT } from "@/components/utils";
import { batchesAPI, ordersAPI } from "@/utils/api-client";
import { Batch, Order } from "@/types";

export default function BatchesPage() {
  const router = useRouter();
  const { userEmail } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [batchNote, setBatchNote] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch batches and orders on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [batchesData, ordersData] = await Promise.all([
        batchesAPI.getAll(),
        ordersAPI.getAll(),
      ]);
      setBatches(batchesData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Failed to load batches. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBatches = batches.filter(
    (batch) =>
      (batch.note?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      batch.id.toString().includes(searchQuery)
  );

  const handleCreateBatch = async () => {
    if (!batchNote.trim()) {
      alert("Please enter a batch note");
      return;
    }

    try {
      const createdBy = userEmail || "system";
      const newBatch = await batchesAPI.create({
        note: batchNote.trim(),
        created_by: createdBy,
        order_ids: [],
      });

      await fetchData(); // Refresh batches list
      alert("Batch created successfully");
      setIsCreateModalOpen(false);
      setBatchNote("");
    } catch (error: unknown) {
      console.error("Error creating batch:", error);
      const errorMessage =
        error && typeof error === "object" && "error" in error
          ? String((error as { error: string }).error)
          : "Failed to create batch. Please try again.";
      alert(errorMessage);
    }
  };

  const handleSuggestBatchNote = async () => {
    setIsGeneratingNote(true);
    try {
      const note = await callGeminiAPI(
        "Generate a concise but descriptive batch name for a group of e-commerce orders"
      );
      setBatchNote(note);
    } catch (error) {
      alert("Failed to generate batch note");
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const calculateBatchSummary = (orderIds: number[]) => {
    const batchOrders = orders.filter((order) => orderIds.includes(order.id));
    const totalAmount = batchOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );

    return {
      totalOrders: orderIds.length,
      totalAmount,
    };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading batches...</p>
        </div>
      </div>
    );
  }

  const handleCreateBatchWithAllOrders = async () => {
    if (!batchNote.trim()) {
      alert("Please enter a batch note");
      return;
    }

    try {
      // Get all order IDs that are not in any batch
      const allBatchedOrderIds = batches.flatMap((b) => b.order_ids || []);
      const unbatchedOrderIds = orders
        .filter((order) => !allBatchedOrderIds.includes(order.id))
        .map((order) => order.id);

      if (unbatchedOrderIds.length === 0) {
        alert("All orders are already in batches");
        return;
      }

      const createdBy = userEmail || "system";
      const newBatch = await batchesAPI.create({
        note: batchNote.trim(),
        created_by: createdBy,
        order_ids: unbatchedOrderIds,
      });

      await fetchData(); // Refresh batches list
      alert(
        `Batch created successfully with ${unbatchedOrderIds.length} orders`
      );
      setIsCreateModalOpen(false);
      setBatchNote("");
    } catch (error: unknown) {
      console.error("Error creating batch:", error);
      const errorMessage =
        error && typeof error === "object" && "error" in error
          ? String((error as { error: string }).error)
          : "Failed to create batch. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Batches</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const allBatchedOrderIds = batches.flatMap(
                (b) => b.order_ids || []
              );
              const unbatchedCount = orders.filter(
                (order) => !allBatchedOrderIds.includes(order.id)
              ).length;
              if (unbatchedCount === 0) {
                alert("All orders are already in batches");
                return;
              }
              setIsCreateModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Batch with All Unbatched Orders
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Empty Batch
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-10"
              placeholder="Search batches by ID or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No batches found. Create your first batch to get started.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const { totalOrders, totalAmount } = calculateBatchSummary(
                    batch.order_ids || []
                  );
                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/batches/${batch.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{batch.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                        {batch.note || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {totalOrders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatBDT(totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(batch.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.created_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/batches/${batch.id}`);
                          }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setBatchNote("");
        }}
        title="Create New Batch"
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Batch Information
                </h3>
                <p className="text-sm text-blue-700">
                  {(() => {
                    const allBatchedOrderIds = batches.flatMap(
                      (b) => b.order_ids || []
                    );
                    const unbatchedCount = orders.filter(
                      (order) => !allBatchedOrderIds.includes(order.id)
                    ).length;
                    return unbatchedCount > 0
                      ? `You have ${unbatchedCount} unbatched order${unbatchedCount !== 1 ? "s" : ""} available to add to this batch.`
                      : "All orders are currently assigned to batches.";
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Batch Note Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span>Batch Note</span>
                <span className="text-xs font-normal text-gray-500">
                  (Required)
                </span>
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSuggestBatchNote}
                loading={isGeneratingNote}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isGeneratingNote ? "Generating..." : "AI Suggest"}
              </Button>
            </div>
            <Textarea
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="e.g., 'March T-Shirt Collection - Dhaka Delivery' or 'Pre-orders for Spring Collection'"
              className="min-h-[120px] text-base"
              rows={4}
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>💡</span>
              <span>
                A descriptive note helps identify and organize batches later.
              </span>
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setBatchNote("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {(() => {
              const allBatchedOrderIds = batches.flatMap(
                (b) => b.order_ids || []
              );
              const unbatchedCount = orders.filter(
                (order) => !allBatchedOrderIds.includes(order.id)
              ).length;
              return unbatchedCount > 0 ? (
                <Button
                  variant="secondary"
                  onClick={handleCreateBatchWithAllOrders}
                  disabled={!batchNote.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Create with {unbatchedCount} Unbatched Order
                  {unbatchedCount !== 1 ? "s" : ""}
                </Button>
              ) : null;
            })()}
            <Button
              onClick={handleCreateBatch}
              disabled={!batchNote.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Empty Batch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
