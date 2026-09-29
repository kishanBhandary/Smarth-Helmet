"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, HardHat, Route, Database, AlertTriangle } from "lucide-react";
import KpiCard from "./KpiCard";
import SafetyChart from "./SafetyChart";
import RiskDonut from "./RiskDonut";

export interface DashboardData {
  stats: {
    totalRiders: number;
    totalHelmets: number;
    totalTrips: number;
    totalDatasets: number;
    totalIncidents: number;
    highSeverity: number;
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
  recentIncidents: Array<{
    id: string;
    incidentId: string;
    riderId: string;
    tripId: string;
    severity: string;
    location: string;
    timestamp: Date;
    status: string;
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
            Safety Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track and analyze rider safety metrics across your fleet.
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard 
          title="Total Riders" 
          value={data.stats.totalRiders} 
          trend={12} 
          icon={Users} 
          iconColorClass="text-blue-600" 
          iconBgClass="bg-blue-50" 
        />
        <KpiCard 
          title="Total Helmets" 
          value={data.stats.totalHelmets} 
          trend={8} 
          icon={HardHat} 
          iconColorClass="text-indigo-600" 
          iconBgClass="bg-indigo-50" 
        />
        <KpiCard 
          title="Total Trips" 
          value={data.stats.totalTrips} 
          trend={18} 
          icon={Route} 
          iconColorClass="text-emerald-600" 
          iconBgClass="bg-emerald-50" 
        />
        <KpiCard 
          title="Total Datasets" 
          value={data.stats.totalDatasets} 
          trend={25} 
          icon={Database} 
          iconColorClass="text-purple-600" 
          iconBgClass="bg-purple-50" 
        />
        <KpiCard 
          title="Total Incidents" 
          value={data.stats.totalIncidents} 
          trend={-8} 
          icon={AlertTriangle} 
          iconColorClass="text-amber-600" 
          iconBgClass="bg-amber-50" 
        />
        <KpiCard 
          title="High Severity" 
          value={data.stats.highSeverity} 
          trend={-25} 
          icon={AlertTriangle} 
          iconColorClass="text-rose-600" 
          iconBgClass="bg-rose-50" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Safety Overview Chart */}
        <div className="lg:col-span-2 rounded-xl bg-white p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Safety Overview</h3>
              <p className="text-sm text-slate-500">Metric trends over time</p>
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
        <div className="rounded-xl bg-white p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Risk Distribution</h3>
            <p className="text-sm text-slate-500">Incidents by severity level</p>
          </div>
          <RiskDonut data={data.riskData} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Incidents Table */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Incidents</h3>
              <p className="text-sm text-slate-500">Latest safety incidents from your company</p>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-medium">Incident ID</th>
                  <th className="px-6 py-3 font-medium">Rider / Trip</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Date & Time</th>
                  <th className="px-6 py-3 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No recent incidents recorded.
                    </td>
                  </tr>
                ) : (
                  data.recentIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4 font-medium text-slate-900">{incident.incidentId || incident.id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{incident.riderId || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{incident.tripId || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate max-w-[150px]">{incident.location || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(incident.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                          incident.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {incident.severity || 'LOW'}
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
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="p-6">
            {data.topLocations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No location data available.</p>
            ) : (
              <div className="space-y-4">
                {data.topLocations.map((loc, index) => {
                  const maxCount = Math.max(...data.topLocations.map(l => l.count), 1);
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
