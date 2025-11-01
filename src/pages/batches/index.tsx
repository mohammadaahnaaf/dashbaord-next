"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, Textarea } from "@/components/ui";
import { useAuth } from "@/contexts";
import { callGeminiAPI } from "@/components/utils";
import { Plus, Search, ArrowRight } from "lucide-react";
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Batches</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Batch
        </Button>
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
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              label="Batch Note"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              className="flex-1"
              placeholder="Enter a descriptive note for this batch..."
            />
            <Button
              variant="secondary"
              onClick={handleSuggestBatchNote}
              loading={isGeneratingNote}
              className="mt-6"
            >
              Suggest
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setBatchNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBatch}>Create Batch</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
