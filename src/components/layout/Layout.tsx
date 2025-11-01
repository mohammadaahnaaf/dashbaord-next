"use client";

import { ReactNode, useState } from "react";
// import { usePathname } from "next/navigation";
import { MobileSidebar, Sidebar } from "./Sidebar";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isTrackingPage = pathname?.includes("/track") || pathname === "/";

  const { userRole } = useAuth();

  // Don't show sidebar on tracking page or when user is not logged in
  if (isTrackingPage || !userRole) {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  return (
    <div className="flex relative min-h-screen bg-gray-50">
      <Sidebar />
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={setIsMobileSidebarOpen}
      />
      <main className={`flex-1 h-screen lg:pl-64 overflow-y-auto`}>
        <header className="flex items-center px-4 justify-between h-20 lg:hidden fixed top-0 left-0 right-0 z-10 bg-gradient-to-r from-blue-50 via-rose-50 to-purple-50 text-blue-500">
          <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
            <Menu className="w-5 h-5" />
          </button>
        </header>
        <div className="pt-20 lg:pt-2">{children}</div>
      </main>
    </div>
  );
}
