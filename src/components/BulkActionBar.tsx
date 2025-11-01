/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button, Modal, Select } from "@/components/ui";
import useStore from "@/store";
// import { showToast } from "@/utils";
import { Batch, Order, UserRole } from "@/types";
import { X } from "lucide-react";

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
  const { orders, batches } = useStore();

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

  const handleAssignToBatch = (batchId: number) => {
    const allBatchedOrderIds = batches.flatMap((b: Batch) => b.order_ids);
    const unbatchedSelectedIds = selectedOrders.filter(
      (id) => !allBatchedOrderIds.includes(id)
    );

    if (unbatchedSelectedIds.length === 0) {
      //   showToast("All selected orders are already in a batch", "info");
      return;
    }

    useStore.setState({
      batches: batches.map((batch: Batch) =>
        batch.id === batchId
          ? {
              ...batch,
              order_ids: [
                ...new Set([...batch.order_ids, ...unbatchedSelectedIds]),
              ],
            }
          : batch
      ),
    });

    // showToast(
    // `${unbatchedSelectedIds.length} orders assigned to Batch #${batchId}`,
    // "success"
    // );

    const skippedCount = selectedOrders.length - unbatchedSelectedIds.length;
    if (skippedCount > 0) {
      // showToast(
      //     `${skippedCount} orders were already in a batch and were skipped`,
      //     "info"
      // );
    }

    setIsAssignBatchModalOpen(false);
    onClearSelection();
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

          <Select
            label="Select Batch"
            options={batches.map((batch: Batch) => ({
              value: batch.id.toString(),
              label: `#${batch.id} - ${batch.note}`,
            }))}
            onChange={(e) => handleAssignToBatch(parseInt(e.target.value))}
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsAssignBatchModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const select = document.querySelector(
                  "select"
                ) as HTMLSelectElement;
                if (select) {
                  handleAssignToBatch(parseInt(select.value));
                }
              }}
            >
              Assign Orders
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
