import { auth } from "@/auth";

export default async function LocationAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Location Analysis</h2>
      </div>
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 p-12 text-center text-slate-500 min-h-[400px] flex flex-col items-center justify-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Geospatial Mapping</h3>
          <p>Interactive maps, risk zone heatmaps, and precise incident location clustering will be rendered here once sufficient GPS telemetry is collected.</p>
        </div>
      </div>
    </div>
  );
}
