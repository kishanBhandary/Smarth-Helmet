import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AlertTriangle, CloudRain, Sun, Wind, Activity, ShieldCheck, HardHat, Users, Route } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) return null;

  // 1. Fetch company predictions and sensor records
  const [
    totalPredictions,
    predictedAccidents,
    predictedSafe,
    severityCrit,
    severityHi,
    severityMed,
    severityLo,
    severityNone,
    records,
    predictions,
    riders,
    trips,
  ] = await Promise.all([
    prisma.prediction.count({ where: { companyId } }),
    prisma.prediction.count({ where: { companyId, accidentPrediction: true } }),
    prisma.prediction.count({ where: { companyId, accidentPrediction: false } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "CRITICAL" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "HIGH" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "MEDIUM" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "LOW" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "NONE" } }),
    prisma.helmetDataRecord.findMany({
      where: { companyId },
      select: {
        id: true,
        weather: true,
        roadCondition: true,
        speed: true,
        acceleration: true,
        tiltAngle: true,
        accident: true,
        riderId: true,
        tripId: true,
      },
      take: 10000,
    }),
    prisma.prediction.findMany({
      where: { companyId },
      select: {
        id: true,
        accidentPrediction: true,
        severityPrediction: true,
        riskScore: true,
        recordId: true,
        riderId: true,
        tripId: true,
        sensorFeatures: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.rider.findMany({
      where: { companyId },
      select: { id: true, riderId: true, name: true },
    }),
    prisma.trip.findMany({
      where: { companyId },
      select: { id: true, tripId: true, startTime: true },
      take: 50,
    }),
  ]);

  // Weather analysis
  const weatherMap: Record<string, { total: number; accidents: number }> = {
    Clear: { total: 0, accidents: 0 },
    Cloudy: { total: 0, accidents: 0 },
    Fog: { total: 0, accidents: 0 },
    Rain: { total: 0, accidents: 0 },
  };

  // Road condition analysis
  const roadMap: Record<string, { total: number; accidents: number }> = {
    Dry: { total: 0, accidents: 0 },
    Normal: { total: 0, accidents: 0 },
    Poor: { total: 0, accidents: 0 },
    Pothole: { total: 0, accidents: 0 },
    Wet: { total: 0, accidents: 0 },
  };

  predictions.forEach((p) => {
    const feat = (p.sensorFeatures as any) || {};
    const w = feat.Weather || "Clear";
    const r = feat.Road_Condition || "Normal";
    const isAcc = Boolean(p.accidentPrediction);

    if (weatherMap[w]) {
      weatherMap[w].total++;
      if (isAcc) weatherMap[w].accidents++;
    } else {
      weatherMap[w] = { total: 1, accidents: isAcc ? 1 : 0 };
    }

    if (roadMap[r]) {
      roadMap[r].total++;
      if (isAcc) roadMap[r].accidents++;
    } else {
      roadMap[r] = { total: 1, accidents: isAcc ? 1 : 0 };
    }
  });

  // Rider-wise statistics
  const riderMap = new Map(riders.map((r) => [r.id, r]));
  const riderStats = new Map<string, { riderName: string; extId: string; total: number; accidents: number; maxProb: number }>();

  predictions.forEach((p) => {
    if (p.riderId) {
      const rObj = riderMap.get(p.riderId);
      const name = rObj?.name || `Rider ${rObj?.riderId || p.riderId}`;
      const extId = rObj?.riderId || p.riderId;
      const prob = p.riskScore || 0;

      if (!riderStats.has(p.riderId)) {
        riderStats.set(p.riderId, {
          riderName: name,
          extId,
          total: 1,
          accidents: p.accidentPrediction ? 1 : 0,
          maxProb: prob,
        });
      } else {
        const s = riderStats.get(p.riderId)!;
        s.total++;
        if (p.accidentPrediction) s.accidents++;
        if (prob > s.maxProb) s.maxProb = prob;
      }
    }
  });

  const sortedRiders = Array.from(riderStats.values())
    .sort((a, b) => b.accidents - a.accidents || b.maxProb - a.maxProb)
    .slice(0, 8);

  const avgProbability =
    predictions.length > 0
      ? predictions.reduce((sum, p) => sum + (p.riskScore || 0), 0) / predictions.length
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">AI Safety & Predictive Analytics</h2>
        <p className="text-sm text-slate-500 mt-1">
          Machine Learning telemetry diagnostics, weather correlations, road-condition impact, and fleet risk profiling.
        </p>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Evaluated Records</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalPredictions.toLocaleString()}</p>
          <span className="text-xs text-slate-400 mt-1 block">Trained ML Pipeline Inference</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-rose-600">Predicted Accidents</span>
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{predictedAccidents.toLocaleString()}</p>
          <span className="text-xs text-slate-400 mt-1 block">RF Classifier Detections</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600">Safe Telemetry</span>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{predictedSafe.toLocaleString()}</p>
          <span className="text-xs text-slate-400 mt-1 block">Nominal Ride Conditions</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-indigo-600">Mean Risk Score</span>
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{avgProbability.toFixed(1)}%</p>
          <span className="text-xs text-slate-400 mt-1 block">Fleet Average Accident Probability</span>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Severity Distribution (XGBoost Classifier)</h3>
        <p className="text-xs text-slate-500">
          Severity inference is executed exclusively for records classified as accidents by the Random Forest pipeline.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <span className="text-xs font-bold text-red-700 uppercase">Critical</span>
            <p className="text-2xl font-bold text-red-700 mt-1">{severityCrit}</p>
            <span className="text-xs text-red-600 mt-1 block">Immediate medical intervention required</span>
          </div>
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <span className="text-xs font-bold text-orange-700 uppercase">High</span>
            <p className="text-2xl font-bold text-orange-700 mt-1">{severityHi}</p>
            <span className="text-xs text-orange-600 mt-1 block">Severe impact / high tilt angle</span>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <span className="text-xs font-bold text-yellow-700 uppercase">Medium</span>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{severityMed}</p>
            <span className="text-xs text-yellow-600 mt-1 block">Moderate speed accident</span>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <span className="text-xs font-bold text-blue-700 uppercase">Low</span>
            <p className="text-2xl font-bold text-blue-700 mt-1">{severityLo}</p>
            <span className="text-xs text-blue-600 mt-1 block">Low speed tilt / minor event</span>
          </div>
        </div>
      </div>

      {/* Environmental Correlations: Weather & Road Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Weather Risk Correlation</h3>
            <CloudRain className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">Accident rate segmented across atmospheric telemetry conditions.</p>

          <div className="space-y-3 pt-2">
            {Object.entries(weatherMap).map(([weather, stats]) => {
              const rate = stats.total > 0 ? (stats.accidents / stats.total) * 100 : 0;
              return (
                <div key={weather} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{weather}</span>
                    <span className="text-slate-500">
                      {stats.accidents} accidents / {stats.total} records ({rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        rate > 40 ? "bg-red-500" : rate > 20 ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Road Condition Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Road Condition Risk Profile</h3>
            <Wind className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">Accident occurrences across surface conditions (Wet, Pothole, Poor, Dry, Normal).</p>

          <div className="space-y-3 pt-2">
            {Object.entries(roadMap).map(([road, stats]) => {
              const rate = stats.total > 0 ? (stats.accidents / stats.total) * 100 : 0;
              return (
                <div key={road} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{road}</span>
                    <span className="text-slate-500">
                      {stats.accidents} accidents / {stats.total} records ({rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        rate > 40 ? "bg-red-500" : rate > 20 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rider-wise Risk Ranking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Rider Safety & Risk Rankings</h3>
            <p className="text-xs text-slate-500">Fleet drivers analyzed by AI model detections</p>
          </div>
          <Users className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Rider Name</th>
                <th className="px-6 py-3">Rider ID</th>
                <th className="px-6 py-3">Total Evaluated Records</th>
                <th className="px-6 py-3">Predicted Accidents</th>
                <th className="px-6 py-3">Peak Risk Probability</th>
                <th className="px-6 py-3">Safety Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedRiders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No rider evaluations available. Upload a dataset to view analytics.
                  </td>
                </tr>
              ) : (
                sortedRiders.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{r.riderName}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">{r.extId}</td>
                    <td className="px-6 py-3.5 text-slate-700">{r.total}</td>
                    <td className="px-6 py-3.5 font-bold text-rose-600">{r.accidents}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{r.maxProb.toFixed(1)}%</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          r.accidents > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {r.accidents > 0 ? "Attention Required" : "Safe Fleet Driver"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
