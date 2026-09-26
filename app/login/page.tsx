"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4 sm:p-8">
      
      {/* ANIMATED BORDER WRAPPER */}
      <div 
        className="relative overflow-hidden rounded-[22px]"
        style={{
          width: "100%",
          maxWidth: "1200px",
          minHeight: "680px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          padding: "1px" // This acts as the 1px border
        }}
      >
        {/* Rotating gradient layer */}
        <div 
          className="absolute left-[50%] top-[50%] h-[200%] w-[200%] animate-border-spin pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg, #DDE3EA 0deg, #DDE3EA 270deg, #5EEAD4 340deg, #0F766E 360deg)"
          }}
        />

        {/* AUTHENTICATION CONTAINER (INNER) */}
        <div className="relative flex flex-col lg:flex-row w-full h-full bg-[#FFFFFF] rounded-[21px] p-[12px] z-10">
          
          {/* LEFT CONTENT (approx 44%) */}
          <div className="flex flex-col items-center justify-center w-full lg:w-[44%] px-6 py-12 lg:px-12">
            
            <div className="w-full max-w-[420px]">
              
              {/* Brand removed */}

              {/* Header */}
              <div className="mb-8">
                <h1 className="text-[32px] font-[700] text-[#111827] leading-[1.2]" style={{ letterSpacing: "-0.03em" }}>
                  Welcome back
                </h1>
                <div className="mt-3 text-[#64748B] leading-[1.6]">
                  <p className="text-[15px] font-medium text-[#172033] mb-1">Sign in to your company workspace.</p>
                  <p className="text-[14px]">Manage rider safety data, incidents, and analytics from one platform.</p>
                </div>
              </div>

              {registered && (
                <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-[14px] font-medium border border-green-200">
                  Company account created successfully. Please sign in.
                </div>
              )}
              
              {/* Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                   <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-[14px] font-medium border border-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[13px] font-[500] text-[#111827]">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="block w-full h-[48px] px-[14px] text-[14px] text-[#111827] bg-[#FFFFFF] border border-[#CBD5E1] rounded-[8px] outline-none transition-all placeholder:text-[#94A3B8]"
                    style={{ boxShadow: "none" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#0F766E";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.10)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#CBD5E1";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    placeholder="company@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-[13px] font-[500] text-[#111827]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full h-[48px] px-[14px] pr-10 text-[14px] text-[#111827] bg-[#FFFFFF] border border-[#CBD5E1] rounded-[8px] outline-none transition-all placeholder:text-[#94A3B8]"
                      style={{ boxShadow: "none" }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#0F766E";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.10)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#CBD5E1";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-[14px] flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-0.5 pb-1">
                  <Link href="/forgot-password" className="text-[13px] text-[#0F766E] hover:underline transition-all">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center h-[48px] rounded-[8px] text-[14px] font-[600] text-[#FFFFFF] bg-[#172033] hover:bg-[#0F172A] disabled:opacity-70 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-7">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E2E8F0]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#FFFFFF] text-[#94A3B8] text-[12px]">
                      or
                    </span>
                  </div>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-3 h-[48px] border border-[#CBD5E1] rounded-[8px] bg-[#FFFFFF] hover:bg-[#F8FAFC] transition-colors text-[14px] font-[500] text-[#172033]"
                  >
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </div>

              <div className="mt-8 text-[14px] text-[#64748B]">
                Don't have a company account?{" "}
                <Link href="/register" className="text-[#0F766E] hover:underline transition-all">
                  Sign up
                </Link>
              </div>
              
            </div>
          </div>

          {/* RIGHT VISUAL PANEL (approx 56%) */}
          <div className="hidden lg:block lg:w-[56%] h-full">
            <div className="relative w-full h-full lg:min-h-[650px] rounded-[16px] overflow-hidden bg-slate-900">
              <Image
                src="/bg.jpeg"
                alt="AI Smart Helmet Data Analytics"
                fill
                sizes="(max-width: 1024px) 100vw, 56vw"
                className="object-cover"
                priority
              />
              
              {/* Optional Information Overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div 
                  className="p-5 rounded-[12px] max-w-sm"
                  style={{
                    background: "rgba(255, 255, 255, 0.90)",
                    backdropFilter: "blur(12px)"
                  }}
                >
                  <h3 className="text-[13px] font-[700] tracking-wider text-[#172033] mb-1">
                    AI-POWERED RIDER SAFETY
                  </h3>
                  <p className="text-[15px] font-medium text-[#475569] leading-snug">
                    Transform helmet data into actionable safety insights.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
