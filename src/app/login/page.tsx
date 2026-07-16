"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { Logo } from "@/components/logo";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Lock, Mail, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

// Form schemas using Zod
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

function LoginForm() {
  const { user, profile, login, resetPassword, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  // Parse redirect query parameter or general error alerts
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const errorMsg = searchParams.get("error");

  useEffect(() => {
    if (errorMsg === "disabled") {
      toast.error("Your account has been suspended or disabled.", { id: "disabled-toast" });
    }
  }, [errorMsg]);

  // If already authenticated and profile loaded, redirect automatically
  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === "admin") {
        router.replace(redirectUrl.includes("login") ? "/dashboard" : redirectUrl);
      } else {
        router.replace("/live-score"); // Members are restricted to live scoring
      }
    }
  }, [user, profile, authLoading, router, redirectUrl]);

  // Initialize login form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Initialize forgot password form
  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    reset: resetForgot,
    formState: { errors: forgotErrors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Handle Login Submit
  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      toast.success("Welcome back to Sachin Stars!");
    } catch (error: any) {
      console.error("Login failure:", error);
      toast.error(error.message || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password Submit
  const onForgotSubmit = async (data: ForgotPasswordFormValues) => {
    setIsForgotSubmitting(true);
    try {
      await resetPassword(data.email);
      toast.success("Password reset email sent! Check your inbox.");
      setIsForgotOpen(false);
      resetForgot();
    } catch (error: any) {
      console.error("Reset password failure:", error);
      toast.error(error.message || "Failed to send reset link. Verify your email.");
    } finally {
      setIsForgotSubmitting(false);
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
        {/* Logo and Header */}
        <div className="flex flex-col items-center">
          <Logo size={60} className="mb-2" />
          <h2 className="mt-4 text-center text-3xl font-extrabold text-[#002B7F] dark:text-white">
            Sign In to Stars
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            Access your secure team scoring and mistakes portal
          </p>
        </div>

        {/* Login Form Container */}
        <div className="glass-panel p-8 rounded-2xl shadow-xl border border-white/20 dark:border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit(onLoginSubmit)}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                  placeholder="name@team.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs font-semibold text-[#FF6B00] hover:text-[#E05E00] focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
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

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  {...register("rememberMe")}
                  className="h-4 w-4 text-[#0A3D91] focus:ring-[#0A3D91] border-slate-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                >
                  Remember Me
                </label>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 btn-primary text-sm font-semibold rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="text-center mt-5">
            <p className="text-xs text-slate-500">
              Need a new administrator account?{" "}
              <Link href="/register" className="font-bold text-[#FF6B00] hover:text-[#E05E00]">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Glass Modal */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsForgotOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 z-10"
            >
              <h3 className="text-lg font-bold text-[#002B7F] dark:text-white mb-2">Reset Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Enter your email address and we will dispatch a secure link to reset your account password.
              </p>

              <form onSubmit={handleSubmitForgot(onForgotSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...registerForgot("email")}
                    className={`block w-full px-3 py-2 bg-white/50 dark:bg-slate-900/50 border ${
                      forgotErrors.email ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D91] text-sm dark:text-white`}
                    placeholder="name@team.com"
                  />
                  {forgotErrors.email && (
                    <p className="mt-1 text-[10px] text-red-500 font-medium">{forgotErrors.email.message}</p>
                  )}
                </div>

                <div className="flex space-x-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-semibold rounded-lg flex items-center justify-center disabled:opacity-50"
                  >
                    {isForgotSubmitting ? <Loader2 className="animate-spin mr-1" size={14} /> : "Send Link"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F7FAFF] dark:bg-[#0B0F19]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#0A3D91]/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#0A3D91] animate-spin"></div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
