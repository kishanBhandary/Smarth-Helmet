import { auth } from "@/auth";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Safety Analytics</h2>
      </div>
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 p-12 text-center text-slate-500">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Predictive Models Initializing</h3>
          <p>The AI and Machine Learning microservices will be integrated here to provide advanced safety analytics, driver scoring, and proactive accident predictions based on telemetry data.</p>
        </div>
      </div>
    </div>
  );
}
