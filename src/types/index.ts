export type UserRole = "admin" | "moderator";

export interface User {
  role: UserRole | null;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  description: string;
  base_price_bdt: number;
  sell_price_bdt: number;
  image_url: string;
  is_active: boolean;
  /**
   * Dashboard-specific fields used by catalog management
   * (not always available on the backend payload).
   */
  buying_price?: number;
  selling_price?: number;
  stock?: number;
  created_at?: string;
  updated_at?: string;
  variants?: {
    group_name: string;
    options: string[];
  }[];
  variant_groups?: {
    color: string;
    sizes: string[];
    sell_price_override?: number;
    image_url?: string;
  }[];
  source_link?: string;
  // New fields from the catalog modal
  category?: string;
  color?: string;
  size?: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_orders: number;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  price: number;
  quantity: number;
  product_id: number;
  product_name_snapshot: string;
  image_url_snapshot: string;
  color_snapshot?: string;
  size_snapshot?: string;
  qty: number;
  sell_price_bdt_snapshot: number;
}

export interface Order {
  id: number;
  customer_id: number;
  items: OrderItem[];
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  address: string;
  delivery_charge_bdt: number;
  advance_bdt: number;
  due_bdt: number;
  pathao_city_name: string;
  pathao_zone_name: string;
  pathao_area_name: string;
  pathao_tracking_code?: string;
  pathao_status?: string;
  last_synced_at?: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_zone: string;
  customer_area: string;
  customer_postal_code: string;
  customer_country: string;
  customer_email: string;
  customer_website: string;
  total_amount: number;
  total_items: number;
  delivery_charge: number;
  delivery_address: string;
}

export interface Batch {
  id: number;
  note: string;
  created_at: string;
  created_by: string;
  order_ids: number[];
}

export interface Settings {
  support_phone: string;
  support_email: string;
  company_name: string;
  appName: string;
  order_tracking_base_url?: string;
  deliveryCharges: {
    inside_dhaka: number;
    outside_dhaka: number;
  };
  packingStatus: {
    enabled: boolean;
    message: string;
  };
  pathao: {
    clientId: string;
    clientSecret: string;
    webhookUrl: string;
    sandboxMode: boolean;
  };
}

export interface AppState {
  currentUser: User;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  batches: Batch[];
  settings: Settings;
  editingOrderId: number | null;
}
