"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { useStore } from "@/hooks/useStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettingsSchema } from "@/lib/validations";
import * as z from "zod";
import {
  Settings as SettingsIcon,
  ShieldAlert,
  Radio,
  Volume2,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";

type SettingsFormValues = z.infer<typeof updateSettingsSchema>;

export default function SettingsPage() {
  const { settings, setSettings, addNotification } = useStore();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(updateSettingsSchema),
  });

  // Watch form fields for real-time visualization (e.g. LED preview or Volume slider value)
  const watchedLedMode = watch("ledMode");
  const watchedVolume = watch("audioVolume");
  const watchedDelay = watch("emergencyDelay");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSettings(data.data);
            
            // Seed React Hook Form
            setValue("fallDetection", data.data.fallDetection);
            setValue("blindSpotAlerts", data.data.blindSpotAlerts);
            setValue("autoEmergencyCall", data.data.autoEmergencyCall);
            setValue("emergencyDelay", data.data.emergencyDelay);
            setValue("ledMode", data.data.ledMode);
            setValue("audioVolume", data.data.audioVolume);
          }
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [setValue, setSettings]);

  const onSubmit = async (data: SettingsFormValues) => {
    setError(null);
    setSuccess(false);
    setSubmitLoading(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        setSettings(resJson.data);
        setSuccess(true);
        addNotification({
          title: "Settings Updated",
          message: "HUD configuration changes sync'd to helmet firmware.",
          type: "SYSTEM",
        });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(resJson.error || "Failed to update configurations");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-mono font-semibold uppercase tracking-widest">
            Syncing Configuration Firmware...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">System Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Fine-tune active HUD alerts, impact sensors, and physical helmet hardware parameters.
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-lg animate-pulse">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Helmet configurations synchronized successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-4 py-3 rounded-lg animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-3 gap-8">
          {/* Left / Middle Column: Form settings */}
          <div className="md:col-span-2 space-y-6">
            {/* Box 1: Safety & Telemetry */}
            <div className="glass rounded-xl p-6 border border-white/5 space-y-5">
              <h3 className="text-md font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                Active Safety Parameters
              </h3>

              {/* Fall Detection */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <label htmlFor="fallDetection" className="text-sm font-semibold text-white cursor-pointer">
                    Impact Fall Detection (SOS)
                  </label>
                  <p className="text-xs text-slate-500">
                    Triggers emergency call countdown automatically if the helmet registers a severe deceleration event.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="fallDetection"
                  className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-cyan-500 text-cyan-500 shrink-0"
                  {...register("fallDetection")}
                />
              </div>

              {/* Blind Spot Alerts */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-white/5">
                <div className="space-y-0.5">
                  <label htmlFor="blindSpotAlerts" className="text-sm font-semibold text-white cursor-pointer">
                    Rear Radar Hazard Alarms
                  </label>
                  <p className="text-xs text-slate-500">
                    Triggers warning beeps on the HUD when rear-facing sensors detect vehicles approaching rapidly.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="blindSpotAlerts"
                  className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-cyan-500 text-cyan-500 shrink-0"
                  {...register("blindSpotAlerts")}
                />
              </div>

              {/* Auto Call */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-white/5">
                <div className="space-y-0.5">
                  <label htmlFor="autoEmergencyCall" className="text-sm font-semibold text-white cursor-pointer">
                    Autonomous Dispatch Broadcast
                  </label>
                  <p className="text-xs text-slate-500">
                    Sends geocoded distress SMS automatically when the SOS countdown expires without rider interaction.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="autoEmergencyCall"
                  className="w-5 h-5 rounded border-white/10 bg-slate-900 accent-cyan-500 text-cyan-500 shrink-0"
                  {...register("autoEmergencyCall")}
                />
              </div>

              {/* SOS countdown timer */}
              <div className="space-y-1.5 pt-3 border-t border-white/5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Distress Countdown Interval
                  </label>
                  <span className="text-sm font-bold text-cyan-400 font-mono">{watchedDelay || 30}s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  {...register("emergencyDelay", { valueAsNumber: true })}
                />
                <p className="text-[10px] text-slate-500">
                  Delay buffer before geocoded SMS messages are broadcasted to registered emergency contacts.
                </p>
              </div>
            </div>

            {/* Box 2: Physical Helmet Configs */}
            <div className="glass rounded-xl p-6 border border-white/5 space-y-5">
              <h3 className="text-md font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Physical Hardware Controls
              </h3>

              {/* Led Modes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  LED Safety Light Pattern
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["SOLID", "FLASHING", "PULSE", "OFF"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setValue("ledMode", mode as any)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                        watchedLedMode === mode
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                          : "bg-slate-900/50 border-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {/* Register hidden input */}
                <input type="hidden" {...register("ledMode")} />
              </div>

              {/* Audio Volume */}
              <div className="space-y-1.5 pt-3 border-t border-white/5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    HUD Speaker Volume
                  </label>
                  <span className="text-sm font-bold text-cyan-400 font-mono">{watchedVolume || 80}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  {...register("audioVolume", { valueAsNumber: true })}
                />
                <p className="text-[10px] text-slate-500">
                  Controls the volume of hazard radar alarms and navigation HUD voice outputs.
                </p>
              </div>
            </div>

            {/* Save Buttons */}
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold py-3 rounded-lg text-sm hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Flashing Firmware Settings...
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>

          {/* Right Column: Visual HUD Preview Widget */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-cyan-400" />
              HUD Visualizer
            </h3>

            <div className="glass rounded-xl p-5 border border-white/5 space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest pb-1 border-b border-white/5">
                Physical LED Preview
              </div>

              <div className="relative h-44 rounded-lg bg-slate-950 border border-white/5 overflow-hidden flex flex-col items-center justify-center p-4">
                {/* Glowing simulated LED ring */}
                <div
                  className={`w-28 h-28 rounded-full border-4 transition-all duration-500 flex items-center justify-center ${
                    watchedLedMode === "SOLID"
                      ? "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                      : watchedLedMode === "FLASHING"
                      ? "border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] animate-pulse"
                      : watchedLedMode === "PULSE"
                      ? "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse"
                      : "border-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    {watchedLedMode || "SOLID"}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed pt-2">
                Helmet uses built-in smart LED strips that adapt to environmental conditions. Solid/flashing pattern modes provide high visibility during night riding commutes.
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
