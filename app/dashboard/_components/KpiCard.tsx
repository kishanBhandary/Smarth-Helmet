import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
}

export default function KpiCard({
  title,
  value,
  trend,
  trendLabel = "vs last month",
  icon: Icon,
  iconColorClass,
  iconBgClass,
}: KpiCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgClass}`}>
          <Icon className={`h-5 w-5 ${iconColorClass}`} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        {trend !== undefined && (
          <div className="flex items-center text-sm">
            <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? '+' : ''}{trend}%
            </span>
            <span className="text-slate-500 ml-2">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
