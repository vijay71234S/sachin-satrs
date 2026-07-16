"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect to login if not authenticated
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile) {
      if (profile.disabled) {
        router.replace("/login?error=disabled");
        return;
      }

      // If requireAdmin is true, but user is not admin
      if (requireAdmin && profile.role !== "admin") {
        router.replace("/live-score"); // Redirect to their allowed route
        return;
      }

      // Normal member is restricted ONLY to live-scoring and mistakes log
      if (profile.role === "member") {
        const allowedRoutes = ["/live-score", "/mistakes", "/login"];
        // Allow path if it is exactly in the allowed routes, or start with those paths
        const isAllowed = allowedRoutes.some(
          (route) => pathname === route || pathname.startsWith(route + "/")
        );

        if (!isAllowed) {
          router.replace("/live-score");
        }
      }
    }
  }, [user, profile, loading, requireAdmin, pathname, router]);

  // Render a clean glassmorphism spinner when loading or state is resolving
  if (loading || !user || (requireAdmin && (!profile || profile.role !== "admin")) || (profile && profile.role === "member" && !pathname.startsWith("/live-score") && !pathname.startsWith("/mistakes") && pathname !== "/login")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAFF] dark:bg-slate-900 transition-colors duration-300">
        <div className="flex flex-col items-center space-y-4 p-8 glass-panel max-w-sm rounded-2xl shadow-xl border border-white/20">
          {/* Spinner Animation */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#0A3D91]/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#0A3D91] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#002B7F] dark:text-white">Sachin Stars</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Loading secure environment...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
