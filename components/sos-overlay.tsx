"use client";

import React, { useEffect, useRef } from "react";
import { useStore } from "@/hooks/useStore";
import { AlertOctagon, ShieldAlert, PhoneCall, Volume2, VolumeX } from "lucide-react";

export default function SOSOverlay() {
  const {
    crashSOSActive,
    crashSOSCountdown,
    setSOSCountdown,
    cancelCrashSOS,
    emergencyContacts,
    settings,
    addNotification
  } = useStore();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Sound Warning: Generate a warning alarm beep using the Web Audio API
  const startAlarm = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sawtooth";
      // Dual tone alert
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);

      // Beep cycle
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
    } catch (e) {
      console.warn("AudioContext block by browser auto-play policy");
    }
  };

  const stopAlarm = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      console.error("Error stopping audio", e);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (crashSOSActive && crashSOSCountdown !== null) {
      // Start warning sound
      startAlarm();

      if (crashSOSCountdown > 0) {
        timer = setTimeout(() => {
          setSOSCountdown(crashSOSCountdown - 1);
        }, 1000);
      } else {
        // Countdown reached 0: dispatch emergency contacts
        stopAlarm();
        // Log critical event
        addNotification({
          title: "EMERGENCY: SOS Dispatched",
          message: `SOS alert broadcasted to ${emergencyContacts.length} emergency contact(s). GPS coordinates transmitted.`,
          type: "CRASH",
        });

        // Trigger SMS/call simulation
        emergencyContacts.forEach((contact) => {
          console.log(`SIMULATION: Notifying ${contact.name} (${contact.phone}) via SMS / Call!`);
        });
      }
    } else {
      stopAlarm();
    }

    return () => {
      clearTimeout(timer);
      stopAlarm();
    };
  }, [crashSOSActive, crashSOSCountdown]);

  if (!crashSOSActive) return null;

  const isDispatched = crashSOSCountdown === 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md px-4">
      {/* Pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full border border-rose-500/20 animate-ping-slow absolute" />
        <div className="w-[600px] h-[600px] rounded-full border border-rose-500/10 animate-ping-slow absolute" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="relative w-full max-w-lg glass-destructive border-rose-500/40 rounded-2xl p-8 md:p-10 shadow-2xl text-center flex flex-col items-center gap-6">
        {/* Flashing Icon */}
        <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 animate-pulse">
          <AlertOctagon className="w-10 h-10" />
        </div>

        {/* Alarm Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-rose-500 uppercase tracking-widest animate-pulse">
            {isDispatched ? "SOS Alert Sent" : "Impact Detected"}
          </h2>
          <p className="text-slate-300 text-sm max-w-sm">
            {isDispatched
              ? "Emergency response dispatched. Vitals and GPS position transmitted."
              : "A fall has been detected. The device will automatically notify your emergency contacts."}
          </p>
        </div>

        {/* Countdown / Status */}
        {!isDispatched ? (
          <div className="flex flex-col items-center justify-center">
            <div className="text-7xl font-black text-white font-mono tracking-tight my-2">
              {crashSOSCountdown}
            </div>
            <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">
              Seconds until emergency transmission
            </span>
          </div>
        ) : (
          <div className="w-full glass bg-slate-900/50 p-4 rounded-xl border border-rose-500/20 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold justify-center text-xs uppercase">
              <ShieldAlert className="w-4 h-4" />
              Notified Contacts
            </div>
            <div className="divide-y divide-white/5 max-h-32 overflow-y-auto text-left text-sm">
              {emergencyContacts.length > 0 ? (
                emergencyContacts.map((contact) => (
                  <div key={contact.id} className="py-2 flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">{contact.name} ({contact.relationship})</span>
                    <span className="text-slate-400 font-mono">{contact.phone}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-2">
                  No emergency contacts configured! Add contacts in the dashboard.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 w-full mt-4">
          {!isDispatched ? (
            <button
              onClick={cancelCrashSOS}
              className="w-full bg-rose-500 text-white font-bold py-4 rounded-xl text-lg hover:bg-rose-600 shadow-lg shadow-rose-500/35 hover:shadow-rose-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              CANCEL SOS (I'M OK)
            </button>
          ) : (
            <button
              onClick={cancelCrashSOS}
              className="w-full bg-slate-800 text-white border border-white/10 font-bold py-3.5 rounded-xl text-base hover:bg-slate-700 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Dismiss Notification
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Volume2 className="w-4 h-4" />
            <span>Siren active. Cancel to silence alarm.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
