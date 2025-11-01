// Date formatting
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Currency formatting
export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Mock Gemini API call
export async function callGeminiAPI(prompt: string): Promise<string> {
  // In a real application, this would call the actual Gemini API
  // For now, we'll return mock responses based on the prompt type
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

  if (prompt.includes("follow-up message")) {
    return `Dear [Customer Name],\n\nThank you for your order #[Order ID]. We wanted to update you on your order status. Your package is being prepared with care and will be shipped soon.\n\nBest regards,\nFashion Store Team`;
  }

  if (prompt.includes("product description")) {
    return `A stylish and comfortable piece perfect for any casual occasion. Made from high-quality materials, featuring a modern fit and excellent durability. Available in multiple colors and sizes.`;
  }

  if (prompt.includes("batch name")) {
    return `${new Date().toLocaleString("en-US", {
      month: "long",
    })} Collection Batch`;
  }

  return "I apologize, but I need more context to generate a specific response.";
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

// Generate unique product code
export function generateProductCode(name: string): string {
  const prefix = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}${randomNum}`;
}

// Calculate order summary
export function calculateOrderSummary(
  items: Array<{ qty: number; sell_price_bdt_snapshot: number }>,
  deliveryCharge: number,
  advance: number
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.sell_price_bdt_snapshot * item.qty,
    0
  );
  const total = subtotal + deliveryCharge;
  const due = total - advance;

  return {
    subtotal,
    total,
    due,
  };
}

// Role-based access control
export function hasAccess(
  userRole: string | null,
  requiredRoles: string[]
): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

// Toast types
export type ToastType = "success" | "error" | "info" | "warning";

// Show toast notification (to be implemented with a toast library)
export function showToast(message: string, type: ToastType = "info"): void {
  // This will be implemented with a toast library like react-hot-toast
  console.log(`[${type.toUpperCase()}] ${message}`);
}
