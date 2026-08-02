"use client";

import React, { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import SOSOverlay from "./sos-overlay";
import { useStore } from "@/hooks/useStore";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setUser, setHelmet, setEmergencyContacts, setSettings } = useStore();

  // Inactivity auto-logout (Idle Timeout: 3 minutes)
  useEffect(() => {
    if (status !== "authenticated") return;

    const INACTIVITY_TIMEOUT = 180000; // 3 minutes in milliseconds
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, INACTIVITY_TIMEOUT);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

    resetIdleTimer();

    events.forEach((evt) => {
      document.addEventListener(evt, resetIdleTimer);
    });

    return () => {
      clearTimeout(idleTimer);
      events.forEach((evt) => {
        document.removeEventListener(evt, resetIdleTimer);
      });
    };
  }, [status]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Seed the Zustand store from database queries when session loads
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name || "Aegis Rider",
        email: session.user.email || "",
        role: session.user.role || "USER",
      });

      // Load initial helmet and settings from backend APIs
      const loadInitialTelemetry = async () => {
        try {
          // Fetch settings
          const settingsRes = await fetch("/api/settings");
          if (settingsRes.ok) {
            const data = await settingsRes.json();
            if (data.success) setSettings(data.data);
          }

          // Fetch helmets
          const helmetsRes = await fetch("/api/helmets");
          if (helmetsRes.ok) {
            const data = await helmetsRes.json();
            if (data.success && data.data.length > 0) {
              const activeHelmet = data.data[0];
              setHelmet({
                id: activeHelmet.id,
                name: activeHelmet.name,
                serialNumber: activeHelmet.serialNumber,
                status: activeHelmet.status,
                batteryLevel: activeHelmet.batteryLevel,
                firmwareVersion: activeHelmet.firmwareVersion,
              });
            }
          }

          // Fetch emergency contacts
          const contactsRes = await fetch("/api/emergency");
          if (contactsRes.ok) {
            const data = await contactsRes.json();
            if (data.success) setEmergencyContacts(data.data);
          }
        } catch (error) {
          console.error("Failed to load initial rider telemetry", error);
        }
      };

      loadInitialTelemetry();
    }
  }, [session, setUser, setHelmet, setEmergencyContacts, setSettings]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-cyan-400">
        <Loader2 className="w-10 h-10 animate-spin" />
        <span className="text-sm font-semibold tracking-wider uppercase font-mono">
          Securing Telemetry Links...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Global Fall SOS Overlay */}
      <SOSOverlay />
    </div>
  );
}
