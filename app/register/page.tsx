"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
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
                  Create your company account
                </h1>
                <div className="mt-3 text-[#64748B] leading-[1.6]">
                  <p className="text-[14px]">Set up your company's AI SmartData workspace.</p>
                </div>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                   <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-[14px] font-medium border border-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="block text-[13px] font-[500] text-[#111827]">
                    Company name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
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
                    placeholder="Enter company name"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[13px] font-[500] text-[#111827]">
                    Official company email
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
                  <label htmlFor="phone" className="block text-[13px] font-[500] text-[#111827]">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
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
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-[13px] font-[500] text-[#111827]">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
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
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center h-[48px] rounded-[8px] text-[14px] font-[600] text-[#FFFFFF] bg-[#172033] hover:bg-[#0F172A] disabled:opacity-70 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create company account"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-4 text-center">
                <p className="text-[12px] text-[#94A3B8]">
                  By creating an account, you agree to our Terms and Privacy Policy.
                </p>
              </div>

              <div className="mt-8 text-[14px] text-[#64748B]">
                Already have an account?{" "}
                <Link href="/login" className="text-[#0F766E] hover:underline transition-all">
                  Sign in
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
