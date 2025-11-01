/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import {
  AppState,
  Product,
  Customer,
  Order,
  Batch,
  Settings,
  User,
} from "@/types";

// Mock data
const mockProducts: Product[] = [
  {
    id: 1,
    name: "Classic White T-Shirt",
    code: "CWT001",
    description: "Premium cotton white t-shirt with a classic fit.",
    base_price_bdt: 250,
    sell_price_bdt: 450,
    image_url: "https://example.com/images/white-tshirt.jpg",
    is_active: true,
    variants: [
      {
        group_name: "Size",
        options: ["S", "M", "L", "XL"],
      },
      {
        group_name: "Color",
        options: ["White", "Black", "Gray"],
      },
    ],
  },
];

const mockCustomers: Customer[] = [
  {
    id: 1,
    name: "John Doe",
    phone: "01712345678",
    total_orders: 3,
    created_at: "2024-01-15T10:30:00Z",
    email: "john.doe@example.com",
    address: "123 Main St, Dhaka",
  },
];

const mockOrders: Order[] = [
  {
    id: 1,
    customer_id: 1,
    items: [
      {
        product_id: 1,
        product_name_snapshot: "Classic White T-Shirt",
        image_url_snapshot: "https://example.com/images/white-tshirt.jpg",
        color_snapshot: "White",
        size_snapshot: "L",
        qty: 2,
        sell_price_bdt_snapshot: 450,
        price: 450,
        quantity: 2,
      },
    ],
    status: "pending",
    address: "123 Main St, Dhaka",
    delivery_charge_bdt: 70,
    advance_bdt: 500,
    due_bdt: 400,
    pathao_city_name: "Dhaka",
    pathao_zone_name: "Mirpur",
    pathao_area_name: "Mirpur 10",
    created_at: "2024-03-15T14:30:00Z",
    customer_name: "John Doe",
    customer_phone: "01712345678",
    customer_address: "123 Main St, Dhaka",
    customer_city: "Dhaka",
    customer_zone: "Mirpur",
    customer_area: "Mirpur 10",
    customer_postal_code: "12345",
    customer_country: "Bangladesh",
    customer_email: "john.doe@example.com",
    customer_website: "https://example.com",
    total_amount: 1000,
    total_items: 2,
    delivery_charge: 70,
    delivery_address: "123 Main St, Dhaka",
  },
];

const mockBatches: Batch[] = [
  {
    id: 501,
    note: "March T-Shirt Collection",
    created_at: "2024-03-01T09:00:00Z",
    created_by: "admin",
    order_ids: [1],
  },
];

const mockSettings: Settings = {
  support_phone: "01712345678",
  support_email: "support@example.com",
  company_name: "Fashion Store",
  appName: "Fashion Store Dashboard",
  deliveryCharges: {
    inside_dhaka: 70,
    outside_dhaka: 130,
  },
  packingStatus: {
    enabled: true,
    message:
      "We are currently experiencing high order volume. Orders may take 1-2 extra days to process.",
  },
  pathao: {
    clientId: "your-client-id",
    clientSecret: "your-client-secret",
    webhookUrl: "https://your-domain.com/api/pathao-webhook",
    sandboxMode: true,
  },
};

// Create store
const useStore = create<AppState>((set) => ({
  currentUser: {
    role: null,
  },
  products: mockProducts,
  customers: mockCustomers,
  orders: mockOrders,
  batches: mockBatches,
  settings: mockSettings,
  editingOrderId: null,

  // Actions
  setCurrentUser: (role: any) =>
    set((state) => ({ currentUser: { ...state.currentUser, role } })),
  addProduct: (product: Product) =>
    set((state) => ({ products: [...state.products, product] })),
  updateProduct: (id: number, product: Product) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...product } : p
      ),
    })),
  addCustomer: (customer: Customer) =>
    set((state) => ({ customers: [...state.customers, customer] })),
  addOrder: (order: Order) =>
    set((state) => ({ orders: [...state.orders, order] })),
  updateOrder: (id: number, order: Order) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, ...order } : o)),
    })),
  addBatch: (batch: Batch) =>
    set((state) => ({ batches: [...state.batches, batch] })),
  updateBatch: (id: number, batch: Batch) =>
    set((state) => ({
      batches: state.batches.map((b) => (b.id === id ? { ...b, ...batch } : b)),
    })),
  updateSettings: (settings: Settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
  setEditingOrderId: (id: number) => set({ editingOrderId: id }),
}));

export default useStore;
