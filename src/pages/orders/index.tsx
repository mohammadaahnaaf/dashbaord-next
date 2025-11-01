import { useState } from "react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { Input, Button, StatusChip } from "@/components/ui";
import useStore from "@/store";
import { formatDate, formatBDT } from "@/components/utils";
import { Search, Filter } from "lucide-react";
import OrderDrawer from "@/components/orders/OrderDrawer";
import BulkActionsBar from "@/components/orders/BulkActionsBar";
import { Customer, Order } from "@/types";

// Force server-side rendering to avoid static generation issues with Zustand store
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

export default function OrdersPage() {
  const router = useRouter();
  const orders = useStore((state) => state.orders);
  const customers = useStore((state) => state.customers);
  const currentUser = useStore((state) => state.currentUser);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrders((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && orders) {
      setSelectedOrders(orders.map((order: Order) => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const filteredOrders = (orders || []).filter((order: Order) => {
    if (!order) return false;
    const customer = (customers || []).find(
      (c: Customer) => c.id === order.customer_id
    );
    const searchString =
      `${order.id} ${customer?.name} ${customer?.phone} ${order.status}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Button onClick={() => router.push("/create-order")}>
          Create Order
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
              icon={<Search className="w-5 h-5 text-gray-400" />}
            />
          </div>
          <Button variant="secondary">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <BulkActionsBar
          selectedOrders={selectedOrders}
          onClearSelection={() => setSelectedOrders([])}
          userRole={currentUser.role}
        />
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    orders
                      ? selectedOrders.length === orders.length &&
                        orders.length > 0
                      : false
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order: Order) => {
              const customer = (customers || []).find(
                (c: Customer) => c.id === order.customer_id
              );
              const total =
                (order.items || []).reduce(
                  (sum, item) =>
                    sum + (item.sell_price_bdt_snapshot || 0) * (item.qty || 0),
                  0
                ) + (order.delivery_charge_bdt || 0);

              return (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setViewingOrderId(order.id)}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleOrderSelect(order.id);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      #{order.id}
                    </span>
                    <br />
                    <span className="text-sm text-gray-500">
                      {order.items?.length || 0} items
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      {customer?.name}
                    </span>
                    <br />
                    <span className="text-sm text-gray-500">
                      {customer?.phone}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusChip status={order.status} />
                  </td>
                  <td className="px-6 py-4 font-medium">{formatBDT(total)}</td>
                  <td className="px-6 py-4 font-medium text-red-600">
                    {formatBDT(order.due_bdt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Order Drawer */}
      {viewingOrderId && (
        <OrderDrawer
          orderId={viewingOrderId}
          onClose={() => setViewingOrderId(null)}
        />
      )}
    </div>
  );
}
