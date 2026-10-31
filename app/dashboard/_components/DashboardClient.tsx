"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, HardHat, Route, Database, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import KpiCard from "./KpiCard";
import SafetyChart from "./SafetyChart";
import RiskDonut from "./RiskDonut";

export interface DashboardData {
  stats: {
    totalRiders: number;
    totalHelmets: number;
    totalTrips: number;
    totalDatasets: number;
    totalRecords: number;
    totalIncidents: number;
    highSeverity: number;
    predictedAccidents: number;
    predictedNoAccidents: number;
  };
  chartData: Array<{
    date: string;
    incidents: number;
    trips: number;
    accidents: number;
    highSeverity: number;
  }>;
  riskData: {
    low: number;
    medium: number;
    high: number;
  };
  severityDistribution?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  probabilityDistribution?: {
    veryLow: number;
    moderate: number;
    high: number;
    severe: number;
  };
  recentIncidents: Array<{
    id: string;
    incidentId: string;
    riderId: string;
    helmetId?: string;
    tripId: string;
    severity: string;
    location: string;
    timestamp: Date;
    status: string;
    probability?: number;
    isPredicted?: boolean;
  }>;
  topLocations: Array<{
    location: string;
    count: number;
  }>;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "30";
  
  const [timeRange, setTimeRange] = useState(currentRange);
  const [chartMetric, setChartMetric] = useState("Incidents");

  useEffect(() => {
    if (timeRange !== currentRange) {
      router.push(`/dashboard?range=${timeRange}`);
    }
  }, [timeRange, currentRange, router]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Safety & Intelligence Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track and analyze real-time telemetry and machine learning accident predictions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard 
          title="Uploaded Records" 
          value={data.stats.totalRecords.toLocaleString()} 
          icon={Database} 
          iconColorClass="text-purple-600" 
          iconBgClass="bg-purple-50" 
        />
        <KpiCard 
          title="Total Riders" 
          value={data.stats.totalRiders} 
          icon={Users} 
          iconColorClass="text-blue-600" 
          iconBgClass="bg-blue-50" 
        />
        <KpiCard 
          title="Total Helmets" 
          value={data.stats.totalHelmets} 
          icon={HardHat} 
          iconColorClass="text-indigo-600" 
          iconBgClass="bg-indigo-50" 
        />
        <KpiCard 
          title="Total Trips" 
          value={data.stats.totalTrips} 
          icon={Route} 
          iconColorClass="text-emerald-600" 
          iconBgClass="bg-emerald-50" 
        />
        <KpiCard 
          title="AI Predicted Accidents" 
          value={data.stats.predictedAccidents} 
          icon={AlertTriangle} 
          iconColorClass="text-rose-600" 
          iconBgClass="bg-rose-50" 
        />
        <KpiCard 
          title="Safe Telemetry" 
          value={data.stats.predictedNoAccidents} 
          icon={ShieldCheck} 
          iconColorClass="text-teal-600" 
          iconBgClass="bg-teal-50" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Safety Overview Chart */}
        <div className="lg:col-span-2 rounded-xl bg-white p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Safety & Incident Trends</h3>
              <p className="text-sm text-slate-500">Metric trends over selected timeframe</p>
            </div>
            <select
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 shadow-sm focus:outline-none"
            >
              <option value="Incidents">Incidents</option>
              <option value="Trips">Trips</option>
              <option value="Accidents">Accidents</option>
              <option value="High Severity">High Severity</option>
            </select>
          </div>
          <SafetyChart data={data.chartData} selectedMetric={chartMetric} />
        </div>

        {/* Risk Distribution */}
        <div className="rounded-xl bg-white p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Risk & Severity Breakdown</h3>
            <p className="text-sm text-slate-500">Predicted and reported severity distribution</p>
          </div>
          <RiskDonut data={data.riskData} />
          
          {data.severityDistribution && (
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 text-center text-xs">
              <div className="p-1.5 rounded bg-red-50 text-red-700">
                <span className="block font-semibold">Critical</span>
                <span>{data.severityDistribution.critical}</span>
              </div>
              <div className="p-1.5 rounded bg-orange-50 text-orange-700">
                <span className="block font-semibold">High</span>
                <span>{data.severityDistribution.high}</span>
              </div>
              <div className="p-1.5 rounded bg-yellow-50 text-yellow-700">
                <span className="block font-semibold">Medium</span>
                <span>{data.severityDistribution.medium}</span>
              </div>
              <div className="p-1.5 rounded bg-blue-50 text-blue-700">
                <span className="block font-semibold">Low</span>
                <span>{data.severityDistribution.low}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Incidents & Predictions Table */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Incident & AI Prediction Feed</h3>
              <p className="text-sm text-slate-500">Evaluated sensor telemetry records from your company</p>
            </div>
            <button 
              onClick={() => router.push("/dashboard/incidents")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Record ID</th>
                  <th className="px-6 py-3 font-medium">Rider / Helmet</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Date & Time</th>
                  <th className="px-6 py-3 font-medium">AI Probability</th>
                  <th className="px-6 py-3 font-medium">Predicted Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No recent incidents or predictions recorded.
                    </td>
                  </tr>
                ) : (
                  data.recentIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 font-mono text-xs">
                        {incident.incidentId || incident.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{incident.riderId || "Unknown"}</span>
                          <span className="text-xs text-slate-400 font-mono">{incident.helmetId || incident.tripId || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate max-w-[150px]">{incident.location || "Telemetry point"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(incident.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {incident.probability !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold ${
                              incident.probability >= 50 ? "text-rose-600" : "text-emerald-600"
                            }`}>
                              {incident.probability.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-400">AI</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          incident.severity === "CRITICAL" || incident.severity === "Critical" ? "bg-red-100 text-red-700 font-bold" :
                          incident.severity === "HIGH" || incident.severity === "High" ? "bg-orange-100 text-orange-700" :
                          incident.severity === "MEDIUM" || incident.severity === "Medium" ? "bg-amber-100 text-amber-700" :
                          incident.severity === "LOW" || incident.severity === "Low" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {incident.severity || "None"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Risk Locations */}
        <div className="rounded-xl bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Top Risk Locations</h3>
              <p className="text-sm text-slate-500">Highest incident zones</p>
            </div>
            <button 
              onClick={() => router.push("/dashboard/analytics/location")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Map
            </button>
          </div>
          <div className="p-6">
            {data.topLocations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No location data available.</p>
            ) : (
              <div className="space-y-4">
                {data.topLocations.map((loc, index) => {
                  const maxCount = Math.max(...data.topLocations.map((l) => l.count), 1);
                  const percentage = (loc.count / maxCount) * 100;
                  return (
                    <div key={index} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700 truncate pr-4">{loc.location}</span>
                        <span className="text-slate-900 font-semibold">{loc.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
