import { Product, Customer, Order, Batch } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use absolute URL if API_BASE_URL is set, otherwise use relative URL for same-origin requests
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Re-throw if it's already an Error with a message
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise create a new error
    throw new Error(error?.toString() || 'Unknown error occurred');
  }
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string, role: 'admin' | 'moderator') => {
    return apiRequest<{ success: boolean; user: { id: number; email: string; role: string } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }
    );
  },
};

// Products API
export const productsAPI = {
  getAll: async (): Promise<Product[]> => {
    return apiRequest<Product[]>('/api/products');
  },
  getById: async (id: number): Promise<Product> => {
    return apiRequest<Product>(`/api/products/${id}`);
  },
  create: async (product: Partial<Product>): Promise<Product> => {
    return apiRequest<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },
  update: async (id: number, product: Partial<Product>): Promise<Product> => {
    return apiRequest<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },
  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Customers API
export const customersAPI = {
  getAll: async (): Promise<Customer[]> => {
    return apiRequest<Customer[]>('/api/customers');
  },
  getById: async (id: number): Promise<Customer> => {
    return apiRequest<Customer>(`/api/customers/${id}`);
  },
  create: async (customer: Partial<Customer>): Promise<Customer> => {
    return apiRequest<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  },
  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    return apiRequest<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  },
  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const ordersAPI = {
  getAll: async (): Promise<Order[]> => {
    return apiRequest<Order[]>('/api/orders');
  },
  getById: async (id: number): Promise<Order> => {
    return apiRequest<Order>(`/api/orders/${id}`);
  },
  create: async (order: Partial<Order>): Promise<Order> => {
    return apiRequest<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },
  update: async (id: number, order: Partial<Order>): Promise<Order> => {
    return apiRequest<Order>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  },
  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Batches API
export const batchesAPI = {
  getAll: async (): Promise<Batch[]> => {
    return apiRequest<Batch[]>('/api/batches');
  },
  getById: async (id: number): Promise<Batch> => {
    return apiRequest<Batch>(`/api/batches/${id}`);
  },
  create: async (batch: Partial<Batch>): Promise<Batch> => {
    return apiRequest<Batch>('/api/batches', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  },
  update: async (id: number, batch: Partial<Batch>): Promise<Batch> => {
    return apiRequest<Batch>(`/api/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(batch),
    });
  },
  delete: async (id: number): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/batches/${id}`, {
      method: 'DELETE',
    });
  },
};

