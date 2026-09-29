"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  incidents: number;
  trips: number;
  accidents: number;
  highSeverity: number;
}

export default function SafetyChart({ data, selectedMetric }: { data: ChartData[], selectedMetric: string }) {
  const getDataKey = () => {
    switch (selectedMetric) {
      case "Trips": return "trips";
      case "Accidents": return "accidents";
      case "High Severity": return "highSeverity";
      default: return "incidents";
    }
  };

  const getColor = () => {
    switch (selectedMetric) {
      case "Trips": return "#3b82f6"; // blue
      case "Accidents": return "#f59e0b"; // amber
      case "High Severity": return "#ef4444"; // red
      default: return "#8b5cf6"; // purple
    }
  };

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getColor()} stopOpacity={0.3} />
              <stop offset="95%" stopColor={getColor()} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area
            type="monotone"
            dataKey={getDataKey()}
            stroke={getColor()}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorMetric)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
