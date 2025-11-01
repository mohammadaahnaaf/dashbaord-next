import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Select } from "@/components/ui";
import useStore from "@/store";
import { showToast } from "@/components/utils";
import { Order, OrderItem, Product } from "@/types";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatBDT } from "@/components/utils";

export interface OrderFormData {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
}

export interface OrderItemForm {
  product_id: number;
  product_name_snapshot: string;
  image_url_snapshot: string;
  sell_price_bdt_snapshot: number;
  qty: number;
  quantity: number;
  color_snapshot?: string;
  size_snapshot?: string;
  price?: number;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const customerPhone =
    typeof router.query.phone === "string" ? router.query.phone : undefined;

  const products = useStore((state) => state.products);
  const customers = useStore((state) => state.customers);
  const orders = useStore((state) => state.orders);
  const settings = useStore((state) => state.settings);
  // @ts-expect-error - addOrder exists on store but not in AppState type
  const addOrder = useStore((state) => state.addOrder);
  const [isInsideDhaka, setIsInsideDhaka] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<OrderItemForm[]>([]);

  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: "",
    customer_phone: customerPhone || "",
    delivery_address: "",
  });

  useEffect(() => {
    if (customerPhone) {
      const customer = customers.find((c) => c.phone === customerPhone);
      if (customer) {
        // Use setTimeout to avoid setState in effect warning
        setTimeout(() => {
          setFormData({
            customer_name: customer.name,
            customer_phone: customer.phone,
            delivery_address: customer.address || "",
          });
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone]);

  const handleAddProduct = () => {
    setSelectedProducts((prev) => [
      ...prev,
      {
        product_id: 0,
        product_name_snapshot: "",
        image_url_snapshot: "",
        qty: 1,
        sell_price_bdt_snapshot: 0,
        price: 0,
        quantity: 1,
      } as OrderItemForm,
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    if (!product) return;

    setSelectedProducts((prev) =>
      prev.map((item: OrderItemForm, i: number) => {
        if (i === index) {
          return {
            ...item,
            product_id: productId,
            product_name_snapshot: product.name,
            image_url_snapshot: product.image_url,
            sell_price_bdt_snapshot: product.sell_price_bdt,
            price: product.sell_price_bdt,
            qty: item.qty || 1,
            quantity: item.quantity || item.qty || 1,
          };
        }
        return item;
      })
    );
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((item: OrderItemForm, i: number) => {
        if (i === index) {
          const qty = isNaN(quantity) || quantity < 1 ? 1 : quantity;
          return {
            ...item,
            qty,
            quantity: qty,
          };
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce(
      (sum: number, item: OrderItemForm) => {
        const price = item.price || item.sell_price_bdt_snapshot || 0;
        const qty = item.quantity || item.qty || 0;
        return sum + price * qty;
      },
      0
    );

    const deliveryCharge = isInsideDhaka
      ? settings.deliveryCharges.inside_dhaka
      : settings.deliveryCharges.outside_dhaka;

    return {
      subtotal,
      deliveryCharge,
      total: subtotal + deliveryCharge,
    };
  };

  const handleCreateOrder = () => {
    if (
      !formData.customer_name ||
      !formData.customer_phone ||
      !formData.delivery_address
    ) {
      showToast("Please fill in all customer details", "error");
      return;
    }

    if (selectedProducts.length === 0) {
      showToast("Please add at least one product", "error");
      return;
    }

    if (selectedProducts.some((item) => item.product_id === 0)) {
      showToast("Please select all products", "error");
      return;
    }

    // Find or create customer
    let customer = customers.find((c) => c.phone === formData.customer_phone);
    if (!customer) {
      // In a real app, you'd create the customer here
      // For now, we'll use a temporary customer_id
      customer = {
        id: customers.length + 1,
        name: formData.customer_name,
        phone: formData.customer_phone,
        email: "",
        address: formData.delivery_address,
        total_orders: 0,
        created_at: new Date().toISOString(),
      };
    }

    const { deliveryCharge, total } = calculateTotals();

    // Convert OrderItemForm to OrderItem (remove price and quantity)
    const orderItems = selectedProducts.map((item) => ({
      product_id: item.product_id,
      product_name_snapshot: item.product_name_snapshot,
      image_url_snapshot: item.image_url_snapshot,
      qty: item.qty,
      sell_price_bdt_snapshot: item.sell_price_bdt_snapshot,
      ...(item.color_snapshot && { color_snapshot: item.color_snapshot }),
      ...(item.size_snapshot && { size_snapshot: item.size_snapshot }),
    }));

    const totalItems = orderItems.reduce((sum, item) => sum + item.qty, 0);

    const newOrder: Order = {
      id: orders.length + 1,
      customer_id: customer.id || 0,
      items: orderItems as OrderItem[],
      status: "pending",
      address: formData.delivery_address,
      delivery_charge_bdt: deliveryCharge,
      advance_bdt: 0,
      due_bdt: total,
      pathao_city_name: isInsideDhaka ? "Dhaka" : "",
      pathao_zone_name: "",
      pathao_area_name: "",
      created_at: new Date().toISOString(),
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      customer_address: formData.delivery_address,
      customer_city: isInsideDhaka ? "Dhaka" : "",
      customer_zone: "",
      customer_area: "",
      customer_postal_code: "",
      customer_country: "Bangladesh",
      customer_email: customer.email || "",
      customer_website: "",
      total_amount: total,
      total_items: totalItems,
      delivery_charge: deliveryCharge,
      delivery_address: formData.delivery_address,
    };

    addOrder(newOrder);
    showToast("Order created successfully", "success");
    router.push("/orders");
  };

  const { subtotal, deliveryCharge, total } = calculateTotals();

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Create New Order</h1>
      </div>

      <div className="w-full">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customer_name: e.target.value,
                }))
              }
              required
            />
            <Input
              label="Phone Number"
              value={formData.customer_phone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customer_phone: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="mt-4">
            <Input
              label="Delivery Address"
              value={formData.delivery_address}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  delivery_address: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isInsideDhaka}
                onChange={(e) => setIsInsideDhaka(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Inside Dhaka</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Order Items</h2>
            <Button onClick={handleAddProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          <div className="space-y-4">
            {selectedProducts.map((item, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1">
                  <Select
                    label="Product"
                    value={item.product_id.toString()}
                    onChange={(e) =>
                      handleProductChange(index, parseInt(e.target.value))
                    }
                    options={[
                      { value: "0", label: "Select a product" },
                      ...products.map((product: Product) => ({
                        value: product.id.toString(),
                        label: `${product.name} (${formatBDT(
                          product.sell_price_bdt
                        )})`,
                      })),
                    ]}
                  />
                </div>
                <div className="w-32">
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    value={item.quantity || item.qty || 1}
                    onChange={(e) =>
                      handleQuantityChange(index, parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="w-32 pt-6">
                  <p className="font-medium">
                    {formatBDT(
                      (item.price || item.sell_price_bdt_snapshot || 0) *
                        (item.quantity || item.qty || 0)
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-6"
                  onClick={() => handleRemoveProduct(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}

            {selectedProducts.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No products added yet. Click &quot;Add Product&quot; to start.
              </p>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <p className="text-gray-500">Subtotal</p>
                <p>{formatBDT(subtotal)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-500">Delivery Charge</p>
                <p>{formatBDT(deliveryCharge)}</p>
              </div>
              <div className="flex justify-between font-medium">
                <p>Total</p>
                <p>{formatBDT(total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            className="mr-2"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateOrder}>Create Order</Button>
        </div>
      </div>
    </div>
  );
}
