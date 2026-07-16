"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Trophy,
  UserCheck,
  Users,
  FileBarChart2,
  Settings as SettingsIcon,
  LogOut,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import toast from "react-hot-toast";

export const Sidebar: React.FC = () => {
  const { profile, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out.");
    } catch (err) {
      toast.error("Logout failed. Try again.");
    }
  };

  const toggleDarkMode = () => {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains("dark")) {
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // Define menu items based on role
  const adminLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/live-score", label: "Live Scoring", icon: Trophy },
    { href: "/create-user", label: "User Accounts", icon: UserCheck },
    { href: "/players/edit", label: "Player Profiles", icon: Users },
    { href: "/reports/admin", label: "Reports & Stats", icon: FileBarChart2 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const memberLinks = [
    { href: "/live-score", label: "Live Score", icon: Trophy },
    { href: "/mistakes", label: "Mistakes Log", icon: AlertCircle },
  ];

  const links = profile?.role === "admin" ? adminLinks : memberLinks;

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-[#121824] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6 transition-all duration-300">
      
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Logo size={40} />
        </div>

        {/* User Card */}
        <div className="p-4 rounded-xl bg-[#F7FAFF] dark:bg-[#1C2538] border border-slate-100 dark:border-slate-800/50 flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0A3D91] to-[#FF6B00] flex items-center justify-center text-white font-bold text-sm">
              {profile?.playerName?.charAt(0).toUpperCase() || "S"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                {profile?.playerName || "Team Member"}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {profile?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              profile?.role === "admin" 
                ? "bg-[#0A3D91]/10 text-[#0A3D91] dark:bg-[#D9ECFF]/10 dark:text-[#D9ECFF]" 
                : "bg-[#FF6B00]/10 text-[#FF6B00]"
            }`}>
              {profile?.role === "admin" ? "Coach / Admin" : "Player"}
            </span>
            <button 
              onClick={toggleDarkMode}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              <Sun className="h-4 w-4 hidden dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </button>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? "bg-[#0A3D91] text-white shadow-lg shadow-[#0A3D91]/15"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white animate-pulse" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
