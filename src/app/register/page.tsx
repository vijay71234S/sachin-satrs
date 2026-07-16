"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight, 
  User, 
  Phone, 
  Hash 
} from "lucide-react";
import { Logo } from "@/components/logo";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";

// Register validation schema using Zod
const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  playerName: z.string().min(2, "Player name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  playerId: z.string().min(1, "Player ID / Jersey number is required"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      playerName: "",
      phoneNumber: "",
      playerId: "",
    },
  });

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Register the admin using our public API endpoint
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Registration failed");
      }

      // 2. Sign in locally using Firebase Auth client SDK
      await signInWithEmailAndPassword(auth, data.email, data.password);

      toast.success("Admin account registered successfully! Welcome.");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F7FAFF] dark:bg-[#0B0F19] overflow-hidden transition-colors duration-300">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0A3D91] opacity-10 dark:opacity-20 blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF6B00] opacity-10 dark:opacity-25 blur-[100px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center">
          <Logo size={60} className="mb-2" />
          <h2 className="mt-4 text-center text-3xl font-extrabold text-[#002B7F] dark:text-white">
            Register Admin Account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            Create a new head coach/admin profile for Sachin Stars
          </p>
        </div>

        {/* Register Form Container */}
        <div className="glass-panel p-8 rounded-2xl shadow-xl border border-white/20 dark:border-slate-800">
          <form className="space-y-5" onSubmit={handleSubmit(onRegisterSubmit)}>
            
            {/* Player/Admin Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Coach/Admin Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  {...register("playerName")}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-white/50 dark:bg-slate-900/50 border ${
                    errors.playerName ? "border-red-500 text-red-900" : "border-slate-300 dark:border-slate-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D91] focus:border-transparent text-sm dark:text-white`}
                  placeholder="e.g. Coach Sachin"
                />
              </div>
              {errors.playerName && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.playerName.message}</p>
              )}
            </div>

            {/* Player ID / Jersey Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Player ID / Jersey Number
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  {...register("playerId")}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-white/50 dark:bg-slate-900/50 border ${
                    errors.playerId ? "border-red-500 text-red-900" : "border-slate-300 dark:border-slate-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D91] focus:border-transparent text-sm dark:text-white`}
                  placeholder="e.g. SS-COACH or 10"
                />
              </div>
              {errors.playerId && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.playerId.message}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  {...register("email")}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-white/50 dark:bg-slate-900/50 border ${
                    errors.email ? "border-red-500 text-red-900" : "border-slate-300 dark:border-slate-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D91] focus:border-transparent text-sm dark:text-white`}
                  placeholder="admin@sachinstars.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  {...register("phoneNumber")}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D91] focus:border-transparent text-sm dark:text-white"
                  placeholder="e.g. +919876543210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-white/50 dark:bg-slate-900/50 border ${
                    errors.password ? "border-red-500 text-red-900" : "border-slate-300 dark:border-slate-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D91] focus:border-transparent text-sm dark:text-white`}
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 btn-primary text-sm font-semibold rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group pt-3"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <>
                  Register & Sign In
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-5">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#FF6B00] hover:text-[#E05E00]">
                Sign In here
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
