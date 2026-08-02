"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { useStore } from "@/hooks/useStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emergencyContactSchema } from "@/lib/validations";
import * as z from "zod";
import {
  PhoneCall,
  User,
  Plus,
  Trash2,
  Check,
  Star,
  AlertTriangle,
  Mail,
  Loader2
} from "lucide-react";

type ContactFormValues = z.infer<typeof emergencyContactSchema>;

export default function EmergencyPage() {
  const { emergencyContacts, setEmergencyContacts } = useStore();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      name: "",
      phone: "",
      relationship: "",
      email: "",
      isPrimary: false,
    },
  });

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/emergency");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEmergencyContacts(data.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Add Contact
  const onSubmit = async (data: ContactFormValues) => {
    setError(null);
    setSubmitLoading(true);

    try {
      const response = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        reset();
        await fetchContacts();
      } else {
        setError(resJson.error || "Failed to add emergency contact");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Contact
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this emergency contact?")) return;

    try {
      const response = await fetch(`/api/emergency/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Set Primary Contact
  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/emergency/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (response.ok) {
        await fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Emergency Contacts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure contact nodes notified automatically upon impact crash events.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm px-4 py-3 rounded-lg animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add contact Form */}
          <div className="glass p-6 rounded-xl border border-white/5 h-fit">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Add Contact Node
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    {...register("name")}
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] text-rose-400 mt-0.5">{errors.name.message}</p>
                )}
              </div>

              {/* Relationship */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Relationship
                </label>
                <input
                  type="text"
                  placeholder="Spouse, Parent, Friend..."
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  {...register("relationship")}
                />
                {errors.relationship && (
                  <p className="text-[11px] text-rose-400 mt-0.5">{errors.relationship.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-rose-400 mt-0.5">{errors.phone.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-400 mt-0.5">{errors.email.message}</p>
                )}
              </div>

              {/* Primary Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimary"
                  className="w-4 h-4 rounded border-white/10 bg-slate-900 accent-cyan-500 focus:ring-0 focus:ring-offset-0 text-cyan-500"
                  {...register("isPrimary")}
                />
                <label htmlFor="isPrimary" className="text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer">
                  Mark as Primary Node
                </label>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-cyan-500 text-slate-950 font-bold py-2 rounded-lg text-sm hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering Node...
                  </>
                ) : (
                  "Add Contact Node"
                )}
              </button>
            </form>
          </div>

          {/* Contacts List Grid */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-cyan-400" />
              Registered SOS Recipients
            </h3>

            {loading ? (
              <div className="glass rounded-xl p-8 border border-white/5 flex flex-col items-center justify-center gap-2 text-cyan-400 h-64">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-mono font-semibold uppercase tracking-widest">Loading Nodes...</span>
              </div>
            ) : emergencyContacts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`glass rounded-xl p-5 border flex flex-col justify-between gap-4 transition-all relative ${
                      contact.isPrimary ? "border-cyan-500/30 bg-cyan-500/[0.02]" : "border-white/5"
                    }`}
                  >
                    {contact.isPrimary && (
                      <span className="absolute top-4 right-4 text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Primary SOS
                      </span>
                    )}

                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold font-mono">
                        {contact.relationship}
                      </span>
                      <h4 className="text-lg font-bold text-white">{contact.name}</h4>
                      <p className="text-sm font-mono text-cyan-400 font-semibold pt-1">{contact.phone}</p>
                      {contact.email && (
                        <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      {!contact.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(contact.id)}
                          className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className={`font-semibold py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 ${
                          contact.isPrimary
                            ? "w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400"
                            : "px-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {contact.isPrimary ? "Remove Contact" : ""}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl p-12 border border-white/5 text-center flex flex-col items-center justify-center gap-4 text-slate-500">
                <AlertTriangle className="w-10 h-10 text-slate-600" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">No Emergency Contacts Registered</p>
                  <p className="text-sm max-w-xs mx-auto">
                    Please add at least one emergency contact node on the left to allow distress transmissions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
