/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button, Modal, Select } from "@/components/ui";
import useStore from "@/store";
import { Batch, Order, UserRole } from "@/types";
import { X } from "lucide-react";
import { batchesAPI } from "@/utils/api-client";

interface BulkActionsBarProps {
  selectedOrders: number[];
  onClearSelection: () => void;
  userRole: UserRole | null;
}

export default function BulkActionsBar({
  selectedOrders,
  onClearSelection,
  userRole,
}: BulkActionsBarProps) {
  const [isAssignBatchModalOpen, setIsAssignBatchModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  // Guard against SSR - only access store on client side
  const orders = typeof window !== 'undefined' ? (useStore((state) => state.orders) || []) : [];
  const batches = typeof window !== 'undefined' ? (useStore((state) => state.batches) || []) : [];
  const fetchBatches = typeof window !== 'undefined' ? useStore((state) => state.fetchBatches) : null;

  const handleUpdateStatus = async (status: string) => {
    // In a real app, this would be an API call
    useStore.setState({
      orders: orders.map((order: Order) =>
        selectedOrders.includes(order.id)
          ? { ...order, status: status as any }
          : order
      ),
    });

    // showToast(
    //   `Updated ${selectedOrders.length} orders to ${status}`,
    //   "success"
    // );
    onClearSelection();
  };

  const handleAssignToBatch = async (batchId: number) => {
    if (isAssigning) return;

    try {
      setIsAssigning(true);
      
      // Find the batch
      const batch = batches.find((b: Batch) => b.id === batchId);
      if (!batch) {
        alert("Batch not found");
        return;
      }

      // Get all orders that are already in any batch
      const allBatchedOrderIds = batches.flatMap((b: Batch) => b.order_ids || []);
      const unbatchedSelectedIds = selectedOrders.filter(
        (id) => !allBatchedOrderIds.includes(id)
      );

      if (unbatchedSelectedIds.length === 0) {
        alert("All selected orders are already in a batch");
        return;
      }

      // Merge existing order IDs with new ones
      const updatedOrderIds = [
        ...new Set([...(batch.order_ids || []), ...unbatchedSelectedIds]),
      ];

      // Call API to update the batch
      await batchesAPI.update(batchId, {
        order_ids: updatedOrderIds,
      });

      // Refresh batches from API
      if (fetchBatches) {
        await fetchBatches();
      }

      const skippedCount = selectedOrders.length - unbatchedSelectedIds.length;
      if (skippedCount > 0) {
        alert(
          `${unbatchedSelectedIds.length} orders assigned to Batch #${batchId}. ${skippedCount} orders were already in a batch and were skipped.`
        );
      } else {
        alert(`${unbatchedSelectedIds.length} orders assigned to Batch #${batchId}`);
      }

      setIsAssignBatchModalOpen(false);
      onClearSelection();
    } catch (error) {
      console.error("Error assigning orders to batch:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to assign orders to batch. Please try again."
      );
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
      <div className="bg-white border rounded-lg shadow-sm p-4 mb-6 flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {selectedOrders.length} orders selected
        </span>

        <div className="flex-1 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateStatus("confirmed")}
          >
            Mark Confirmed
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateStatus("processing")}
          >
            Mark Processing
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateStatus("shipped")}
          >
            Mark Shipped
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateStatus("delivered")}
          >
            Mark Delivered
          </Button>

          {userRole === "admin" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAssignBatchModalOpen(true)}
              >
                Assign to Batch
              </Button>
              <Button variant="secondary" size="sm">
                Send to Pathao
              </Button>
            </>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Assign to Batch Modal */}
      <Modal
        isOpen={isAssignBatchModalOpen}
        onClose={() => setIsAssignBatchModalOpen(false)}
        title="Assign to Batch"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You have selected {selectedOrders.length} orders. Choose a batch to
            assign them to:
          </p>

          {batches.length === 0 ? (
            <p className="text-sm text-gray-500">
              No batches available. Please create a batch first.
            </p>
          ) : (
            <Select
              label="Select Batch"
              options={batches.map((batch: Batch) => ({
                value: batch.id.toString(),
                label: `#${batch.id} - ${batch.note || "No note"}`,
              }))}
              onChange={(e) => {
                const batchId = parseInt(e.target.value);
                if (batchId) {
                  handleAssignToBatch(batchId);
                }
              }}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsAssignBatchModalOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            {batches.length > 0 && (
              <Button
                onClick={() => {
                  const select = document.querySelector(
                    "select"
                  ) as HTMLSelectElement;
                  if (select && select.value) {
                    handleAssignToBatch(parseInt(select.value));
                  } else {
                    alert("Please select a batch");
                  }
                }}
                loading={isAssigning}
                disabled={isAssigning}
              >
                Assign Orders
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
