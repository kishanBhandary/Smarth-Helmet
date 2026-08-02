"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/dashboard-layout";
import {
  History,
  Activity,
  TrendingUp,
  MapPin,
  Clock,
  Navigation,
  Loader2,
  Calendar
} from "lucide-react";

// Dynamically import Recharts to avoid SSR discrepancies
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

interface Ride {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  status: "ONGOING" | "COMPLETED" | "CANCELLED";
}

interface Analytics {
  summary: {
    totalDistance: number;
    totalDuration: number;
    maxSpeed: number;
    avgSpeed: number;
    ridesCount: number;
    crashCount: number;
    vehicleDetectionsCount: number;
  };
  chartData: Array<{
    month: string;
    distance: number;
    duration: number;
    rides: number;
  }>;
}

export default function RidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ridesRes, analyticsRes] = await Promise.all([
          fetch("/api/rides"),
          fetch("/api/analytics"),
        ]);

        if (ridesRes.ok && analyticsRes.ok) {
          const ridesJson = await ridesRes.json();
          const analyticsJson = await analyticsRes.json();

          if (ridesJson.success) setRides(ridesJson.data);
          if (analyticsJson.success) setAnalytics(analyticsJson.data);
        }
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-mono font-semibold uppercase tracking-widest">
            Compiling Ride Analytics...
          </span>
        </div>
      </DashboardLayout>
    );
  }

  const summary = analytics?.summary || {
    totalDistance: 0,
    totalDuration: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    ridesCount: 0,
    crashCount: 0,
    vehicleDetectionsCount: 0,
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Ride History & Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze historical GPS routing paths, speeds, and safety logs.
          </p>
        </div>

        {/* Aggregated Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass rounded-xl p-5 border border-white/5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Distance</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-white font-mono">{summary.totalDistance}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">KM</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-semibold mt-1 block flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Accumulated riding logs
            </span>
          </div>

          <div className="glass rounded-xl p-5 border border-white/5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Time Ridden</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-white font-mono">
                {formatDuration(summary.totalDuration)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Active HUD telemetry</span>
          </div>

          <div className="glass rounded-xl p-5 border border-white/5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Top Speed</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-white font-mono">{summary.maxSpeed}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">KM/H</span>
            </div>
            <span className="text-[10px] text-teal-400 font-semibold mt-1 block">Rider record peak</span>
          </div>

          <div className="glass rounded-xl p-5 border border-white/5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Rides</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-white font-mono">{summary.ridesCount}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">Trips</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Registered in cloud</span>
          </div>
        </div>

        {/* Charts & Analytics Visuals */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recharts Area Chart */}
          <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Distance Riding Trends (Monthly)
            </h3>
            
            <div className="h-[280px] w-full mt-4">
              {analytics?.chartData && analytics.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey="month"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="distance"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorDistance)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm font-mono">
                  No historical charts data found.
                </div>
              )}
            </div>
          </div>

          {/* Quick summaries sidebar */}
          <div className="glass rounded-xl p-6 border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Safety Audit Summary</h3>
              <p className="text-xs text-slate-400">
                Summary of impact falls, collision alerts, and diagnostic triggers sync'd to this profile.
              </p>

              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400">Crash / SOS Alerts</span>
                  <span className={`font-semibold font-mono ${summary.crashCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {summary.crashCount} Incident(s)
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400">Collision Radar Warnings</span>
                  <span className="font-semibold text-amber-400 font-mono">
                    {summary.vehicleDetectionsCount} Hazard(s)
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pb-2">
                  <span className="text-slate-400">Safety Index Rating</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {summary.crashCount === 0 ? "100/100 (Optimal)" : "85/100 (High)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-lg border border-white/5 text-xs text-slate-500 flex items-start gap-2">
              <Calendar className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p>
                Rides are stored permanently in your history log. Route paths are archived with coordinate checkpoints.
              </p>
            </div>
          </div>
        </div>

        {/* Tabular Ride Logs */}
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Riding Logs
            </h3>
            <span className="text-xs text-slate-400 font-semibold font-mono">
              {rides.length} recorded runs
            </span>
          </div>

          <div className="overflow-x-auto">
            {rides.length > 0 ? (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-semibold text-xs uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-3.5">Title</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Distance</th>
                    <th className="px-6 py-3.5">Duration</th>
                    <th className="px-6 py-3.5">Avg Speed</th>
                    <th className="px-6 py-3.5">Max Speed</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {rides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{ride.title || "Morning Commute"}</td>
                      <td className="px-6 py-4 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(ride.startTime)}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold">{ride.distance} km</td>
                      <td className="px-6 py-4 font-mono">{formatDuration(ride.duration)}</td>
                      <td className="px-6 py-4 font-mono">{ride.avgSpeed} km/h</td>
                      <td className="px-6 py-4 font-mono">{ride.maxSpeed} km/h</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          ride.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : ride.status === "ONGOING"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                            : "bg-slate-800 text-slate-500"
                        }`}>
                          {ride.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm font-mono">
                No rides recorded in this database. Click Start Ride on the Dashboard to record coordinates.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
