import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Users, HardHat, Route, AlertTriangle, Database, Upload } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;

  if (!companyId) return null;

  const [
    totalRiders,
    totalHelmets,
    totalTrips,
    totalDatasets,
    totalRecords,
    totalIncidents,
    highSeverityIncidents
  ] = await Promise.all([
    prisma.rider.count({ where: { companyId } }),
    prisma.helmet.count({ where: { companyId } }),
    prisma.trip.count({ where: { companyId } }),
    prisma.dataset.count({ where: { companyId } }),
    prisma.helmetDataRecord.count({ where: { companyId } }),
    prisma.incident.count({ where: { companyId } }),
    prisma.incident.count({
      where: {
        companyId,
        severity: { in: ["HIGH", "CRITICAL"] }
      }
    })
  ]);

  const stats = [
    { name: "Total Riders", value: totalRiders, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Total Helmets", value: totalHelmets, icon: HardHat, color: "text-indigo-600", bg: "bg-indigo-100" },
    { name: "Total Trips", value: totalTrips, icon: Route, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Total Datasets", value: totalDatasets, icon: Database, color: "text-purple-600", bg: "bg-purple-100" },
    { name: "Total Incidents", value: totalIncidents, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
    { name: "High Severity", value: highSeverityIncidents, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Good morning, {session?.user?.name || "Admin"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Here is your company's rider safety overview.
        </p>
      </div>

      {/* KPI Cards */}
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6 border border-slate-200 transition-all hover:shadow-md"
          >
            <dt>
              <div className={`absolute rounded-md p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-slate-500">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
            </dd>
          </div>
        ))}
      </dl>

      {/* Empty State / CTA */}
      {totalDatasets === 0 && (
        <div className="text-center bg-white border border-slate-200 rounded-lg p-12 shadow-sm">
          <Database className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No datasets uploaded yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload your smart helmet Excel dataset to start analyzing rider safety data.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/datasets/upload"
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <Upload className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Upload Dataset
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
