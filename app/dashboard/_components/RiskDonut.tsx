"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface RiskData {
  low: number;
  medium: number;
  high: number;
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444']; // green, amber, red

export default function RiskDonut({ data }: { data: RiskData }) {
  const total = data.low + data.medium + data.high;
  
  const chartData = [
    { name: 'Low Severity', value: data.low },
    { name: 'Medium Severity', value: data.medium },
    { name: 'High Severity', value: data.high },
  ];

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-400">No risk data available.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center h-64 mt-4">
      <div className="w-1/2 h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800">{total}</span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>
      <div className="w-1/2 flex flex-col justify-center space-y-4 pl-4">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex flex-col">
            <div className="flex items-center text-sm font-medium text-slate-700">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }} />
              {item.name}
            </div>
            <div className="flex items-baseline space-x-2 ml-5">
              <span className="text-lg font-semibold text-slate-900">{item.value}</span>
              <span className="text-xs text-slate-500">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
