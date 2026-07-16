"use client";

import React, { useState, useEffect } from "react";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { useAuth } from "@/context/auth-context";
import toast from "react-hot-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Sliders, 
  Save, 
  Loader2,
  Lock
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const { profile, resetPassword } = useAuth();
  const [clubName, setClubName] = useState("Sachin Stars");
  const [currentLeague, setCurrentLeague] = useState("Mumbai Club T20 Championship");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docSnap = await getDoc(doc(db, "settings", "global"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.clubName) setClubName(data.clubName);
          if (data.currentLeague) setCurrentLeague(data.currentLeague);
        }
      } catch (err) {
        console.warn("Could not load global settings, using defaults:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        clubName,
        currentLeague,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success("Global club configurations saved successfully.");
    } catch (err: any) {
      toast.error("Failed to save configurations: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerResetPassword = async () => {
    if (!profile?.email) return;
    try {
      await resetPassword(profile.email);
      toast.success("A secure password reset link has been dispatched to your email address!");
    } catch (err: any) {
      toast.error("Failed to send reset link: " + err.message);
    }
  };

  return (
    <LayoutWrapper requireAdmin>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#002B7F] dark:text-white flex items-center">
            <SettingsIcon className="mr-3 text-[#FF6B00]" size={32} />
            System Configurations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage club metadata, visual theme attributes, and admin security credentials
          </p>
        </div>

        {/* Global Club Settings Form */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/20 shadow-md">
          <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-4 flex items-center">
            <Sliders className="mr-2 text-[#0A3D91] dark:text-[#D9ECFF]" size={18} />
            Club & Tournament Properties
          </h3>

          <form onSubmit={handleSaveConfigs} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official Club Name</label>
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Active Tournament</label>
                <input
                  type="text"
                  value={currentLeague}
                  onChange={(e) => setCurrentLeague(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 btn-primary text-xs font-semibold rounded-xl flex items-center"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-1.5" size={14} />
                ) : (
                  <Save size={14} className="mr-1.5" />
                )}
                Save Configurations
              </button>
            </div>
          </form>
        </div>

        {/* Brand Theme Display */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/20 shadow-md">
          <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-2 flex items-center">
            <Palette className="mr-2 text-[#0A3D91] dark:text-[#D9ECFF]" size={18} />
            Visual Identity System (Jersey Colors)
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            The system styles are dynamically set using India's active sports color tokens.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#0A3D91] border border-white/25 shadow-sm" />
              <span className="text-xs font-bold mt-2">Primary Blue</span>
              <span className="text-[10px] text-slate-400">#0A3D91</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#002B7F] border border-white/25 shadow-sm" />
              <span className="text-xs font-bold mt-2">Dark Blue</span>
              <span className="text-[10px] text-slate-400">#002B7F</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#FF6B00] border border-white/25 shadow-sm" />
              <span className="text-xs font-bold mt-2">Orange</span>
              <span className="text-[10px] text-slate-400">#FF6B00</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#D9ECFF] border border-slate-205 shadow-sm" />
              <span className="text-xs font-bold mt-2">Light Blue</span>
              <span className="text-[10px] text-slate-450">#D9ECFF</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-slate-250 shadow-sm" />
              <span className="text-xs font-bold mt-2">White</span>
              <span className="text-[10px] text-slate-400">#FFFFFF</span>
            </div>
          </div>
        </div>

        {/* Admin Account & Security Card */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/20 shadow-md">
          <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-2 flex items-center">
            <User className="mr-2 text-[#0A3D91] dark:text-[#D9ECFF]" size={18} />
            Security & Credentials
          </h3>
          <p className="text-xs text-slate-400 mb-6">Manage login options and password controls for this Admin role.</p>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-4 md:space-y-0">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{profile?.playerName || "System Admin"}</p>
              <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>
              <p className="text-[10px] text-indigo-500 uppercase font-black tracking-wider mt-1.5">Role: Administrator</p>
            </div>

            <button
              onClick={handleTriggerResetPassword}
              className="flex items-center px-4 py-2 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold rounded-lg transition-colors border border-[#FF6B00]/10"
            >
              <Lock size={12} className="mr-1.5" />
              Dispatch Password Reset Link
            </button>
          </div>
        </div>

      </div>
    </LayoutWrapper>
  );
}
