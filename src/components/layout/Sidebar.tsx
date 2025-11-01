"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { cn } from "../../utils/cn";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  Boxes,
  PlusCircle,
} from "lucide-react";

const navigation = [
  {
    name: "Orders",
    href: "/orders",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "moderator"],
  },
  {
    name: "Create Order",
    href: "/create-order",
    icon: PlusCircle,
    allowedRoles: ["admin", "moderator"],
  },
  {
    name: "Catalog",
    href: "/catalog",
    icon: Package,
    allowedRoles: ["admin", "moderator"],
  },
  {
    name: "Batches",
    href: "/batches",
    icon: Boxes,
    allowedRoles: ["admin", "moderator"],
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    allowedRoles: ["admin", "moderator"],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["admin"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userRole, logout } = useAuth();

  // Don't render sidebar on public pages
  if (pathname === "/" || pathname.startsWith("/track")) {
    return null;
  }

  return (
    <div className="flex h-full fixed left-0 top-0 w-64 flex-col min-h-screen bg-gray-900">
      <div className="flex h-16 shrink-0 items-center px-6">
        <span className="text-xl font-semibold text-white">Dashboard</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            if (!userRole || !item.allowedRoles.includes(userRole)) {
              return null;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  pathname === item.href
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                  "group flex items-center text-white rounded-md px-2 py-2 text-sm font-medium"
                )}
              >
                <item.icon
                  className={cn(
                    pathname === item.href
                      ? "text-white"
                      : "text-gray-400 group-hover:text-white",
                    "mr-3 h-5 w-5 shrink-0"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="shrink-0 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
