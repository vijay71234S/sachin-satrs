import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Sachin Stars | Premium Cricket Management",
  description: "Private professional cricket management and live scoring platform.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased text-[#0F172A] bg-[#F7FAFF] dark:text-[#F8FAFC] dark:bg-[#0B0F19]`}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              className: "glass-panel dark:text-white border border-white/20 dark:border-slate-800",
              duration: 3000,
              style: {
                background: "rgba(255, 255, 255, 0.8)",
                color: "#0F172A",
                backdropFilter: "blur(8px)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
