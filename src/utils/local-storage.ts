import { Settings, Product, Customer, Order, Batch } from "@/types";

const STORAGE_KEYS = {
  SETTINGS: "app_settings",
  PRODUCTS: "app_products",
  CUSTOMERS: "app_customers",
  ORDERS: "app_orders",
  BATCHES: "app_batches",
  CURRENT_USER: "app_current_user",
  EDITING_ORDER_ID: "app_editing_order_id",
} as const;

// Settings management
export const getSettings = (): Settings => {
  if (typeof window === "undefined") {
    return getDefaultSettings();
  }
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultSettings();
    }
  }
  return getDefaultSettings();
};

export const setSettings = (settings: Settings): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

const getDefaultSettings = (): Settings => {
  return {
    support_phone: "",
    support_email: "",
    company_name: "",
    appName: "",
    order_tracking_base_url: "",
    deliveryCharges: {
      inside_dhaka: 60,
      outside_dhaka: 120,
    },
    packingStatus: {
      enabled: true,
      message: "Your order is being packed with care!",
    },
    pathao: {
      clientId: "",
      clientSecret: "",
      webhookUrl: "",
      sandboxMode: false,
    },
  };
};

// Products management
export const getProducts = (): Product[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const setProducts = (products: Product[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
};

// Customers management
export const getCustomers = (): Customer[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const setCustomers = (customers: Customer[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};

// Orders management
export const getOrders = (): Order[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const setOrders = (orders: Order[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
};

// Batches management
export const getBatches = (): Batch[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEYS.BATCHES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const setBatches = (batches: Batch[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
};

// Current user management
export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentUser = (user: any): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
};

// Editing order ID management
export const getEditingOrderId = (): number | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEYS.EDITING_ORDER_ID);
  if (stored) {
    try {
      return parseInt(stored, 10);
    } catch {
      return null;
    }
  }
  return null;
};

export const setEditingOrderId = (orderId: number | null): void => {
  if (typeof window === "undefined") return;
  if (orderId === null) {
    localStorage.removeItem(STORAGE_KEYS.EDITING_ORDER_ID);
  } else {
    localStorage.setItem(STORAGE_KEYS.EDITING_ORDER_ID, orderId.toString());
  }
};

