"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Logo } from "@/components/logo";

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else if (profile) {
      if (profile.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/live-score");
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFF] dark:bg-[#0B0F19]">
      <div className="flex flex-col items-center space-y-4 p-8 glass-panel max-w-sm rounded-2xl shadow-xl border border-white/20">
        {/* Animated Loading Ring */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#0A3D91]/20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#0A3D91] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <div className="text-center">
          <Logo size={40} className="justify-center mb-1" />
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-2 font-semibold">
            Configuring secure landing session...
          </p>
        </div>
      </div>
    </div>
  );
}
