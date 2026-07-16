"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

interface LayoutWrapperProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children, requireAdmin = false }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <AuthGuard requireAdmin={requireAdmin}>
      <div className="min-h-screen flex bg-[#F7FAFF] dark:bg-[#0B0F19] transition-colors duration-300">
        
        {/* Desktop Sidebar (hidden on mobile/tablet) */}
        <div className="hidden lg:block sticky top-0 h-screen">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Slide-out Drawer */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Drawer */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-[#121824] focus:outline-none transition-all duration-300">
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="h-full overflow-y-auto">
                <Sidebar />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          
          {/* Mobile Top Header (hidden on desktop) */}
          <header className="lg:hidden bg-white dark:bg-[#121824] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
            <Logo size={32} />
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            >
              <Menu size={24} />
            </button>
          </header>

          {/* Main Body */}
          <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            {children}
          </main>

        </div>
      </div>
    </AuthGuard>
  );
};
export default LayoutWrapper;
