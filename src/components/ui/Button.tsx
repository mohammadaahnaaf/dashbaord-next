"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      disabled,
      loading = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center text-white rounded-xl justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
      secondary:
        "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500",
      outline:
        "border border-gray-300 bg-transparent hover:bg-gray-100 focus-visible:ring-gray-500",
      ghost:
        "hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
      link: "text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-600",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4",
      lg: "h-11 px-8 text-lg",
    };

    return (
      <button
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
