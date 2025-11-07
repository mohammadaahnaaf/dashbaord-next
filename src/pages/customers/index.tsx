"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
// import { showToast } from '@/utils';
import { Plus, Search, ShoppingBag, Edit2, Trash2 } from "lucide-react";
import { formatDate } from "@/components/utils";
import { Customer, Order } from "@/types";
import { CustomerModal } from "@/components/modals/CustomerModal";
import { customersAPI, ordersAPI } from "@/utils/api-client";
// import { CustomerModal as CustomerModalComponent } from "@/components/modals/CustomerModal";

export interface CustomerEditFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const customersData = await customersAPI.getAll();
      setCustomers(customersData);
      const ordersData = await ordersAPI.getAll();
      setOrders(ordersData);
    };
    fetchData();
  }, []);

  const [formData, setFormData] = useState<CustomerEditFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCustomer = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Name and phone are required");
      return;
    }

    const newCustomer: Customer = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      created_at: new Date().toISOString(),
      id: customers.length + 1,
      total_orders: 0,
    };

    setCustomers([...customers, newCustomer]);
    alert("Customer created successfully");
    setIsCreateModalOpen(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
    });
  };

  const handleEditCustomer = () => {
    if (!editingCustomer) return;

    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Name and phone are required");
      return;
    }

    setCustomers(
      customers.map((customer) =>
        customer.id === editingCustomer.id
          ? {
              ...customer,
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              address: formData.address,
              updated_at: new Date().toISOString(),
            }
          : customer
      )
    );

    alert("Customer updated successfully");
    setIsEditModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (customerId: number) => {
    const customerOrders = orders.filter(
      (order) =>
        order.customer_phone ===
        customers.find((c) => c.id === customerId)?.phone
    );

    if (customerOrders.length > 0) {
      alert("Cannot delete customer with existing orders");
      return;
    }

    setCustomers(customers.filter((customer) => customer.id !== customerId));
    alert("Customer deleted successfully");
  };

  const getCustomerOrderCount = (phone: string) => {
    return orders.filter((order) => order.customer_phone === phone).length;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-10"
              placeholder="Search customers by name, phone, or email..."
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
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.email || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                    {customer.address || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCustomerOrderCount(customer.phone)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(customer.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/create-order?phone=${customer.phone}`)
                        }
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCustomer(customer);
                          setFormData({
                            name: customer.name,
                            phone: customer.phone,
                            email: customer.email || "",
                            address: customer.address || "",
                          });
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteCustomer(customer.id as number)
                        }
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <CustomerModal
          isEdit={false}
          formData={formData}
          setFormData={setFormData}
          handleCreateCustomer={handleCreateCustomer}
          handleEditCustomer={handleEditCustomer}
          isEditModalOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
          isCreateModalOpen={isCreateModalOpen}
          setIsCreateModalOpen={setIsCreateModalOpen}
          setEditingCustomer={
            setEditingCustomer as (value: CustomerEditFormData | null) => void
          }
        />
      )}
    </div>
  );
}
