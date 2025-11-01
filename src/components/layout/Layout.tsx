"use client";

import { ReactNode } from "react";
// import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useRouter();
  const isTrackingPage = pathname?.startsWith("/track");
   const { userRole } = useAuth();

  // Don't show sidebar on tracking page or when user is not logged in
  if (isTrackingPage || !userRole) {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  return (
    <div className="flex relative min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 h-screen pl-64 overflow-y-auto">{children}</main>
    </div>
  );
}
