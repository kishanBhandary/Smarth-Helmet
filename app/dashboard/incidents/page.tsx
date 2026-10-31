import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AlertTriangle, Sparkles, ShieldCheck } from "lucide-react";

export default async function IncidentsPage() {
  const session = await auth();

  if (!session?.user?.companyId) {
    return null;
  }

  const companyId = session.user.companyId;

  const [incidents, predictions] = await Promise.all([
    prisma.incident.findMany({
      where: { companyId },
      include: {
        rider: true,
        helmet: true,
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
    prisma.prediction.findMany({
      where: { companyId, accidentPrediction: true },
      include: {
        rider: true,
        helmet: true,
        trip: true,
        record: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Incident Reports & AI Predictions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Confirmed safety incidents and machine-learning detected accident events for your fleet.
          </p>
        </div>
      </div>

      {/* AI Predicted Accidents Table */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden space-y-4">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-600" />
            <h3 className="text-base font-semibold text-slate-900">AI ML Detected Accidents</h3>
          </div>
          <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2.5 py-0.5 rounded-full">
            {predictions.length} Predicted Incidents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Evaluation Date</th>
                <th className="px-6 py-3 font-medium">Rider / Helmet</th>
                <th className="px-6 py-3 font-medium">Trip</th>
                <th className="px-6 py-3 font-medium">AI Probability</th>
                <th className="px-6 py-3 font-medium">Predicted Severity</th>
                <th className="px-6 py-3 font-medium">Sensor Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No accidents detected by the ML models.
                  </td>
                </tr>
              ) : (
                predictions.map((pred) => {
                  const feat = (pred.sensorFeatures as any) || {};
                  return (
                    <tr key={pred.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        {new Date(pred.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {pred.rider?.name || (pred.rider?.riderId ? `Rider ${pred.rider.riderId}` : "Rider")}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Helmet: {pred.helmet?.helmetId || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        {pred.trip?.tripId || "Trip 1"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-rose-600">
                          {pred.accidentProbability ? `${pred.accidentProbability.toFixed(1)}%` : "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            pred.predictedSeverity === "Critical"
                              ? "bg-red-100 text-red-800"
                              : pred.predictedSeverity === "High"
                              ? "bg-orange-100 text-orange-800"
                              : pred.predictedSeverity === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {pred.predictedSeverity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        Speed: {feat.Speed ?? "-"} km/h | Tilt: {feat.Tilt_Angle ?? "-"}° | Weather: {feat.Weather ?? "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmed / Telemetry Incidents Table */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-semibold text-slate-900">Recorded Telemetry Incidents</h3>
          </div>
          <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full">
            {incidents.length} Records
          </span>
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Date & Time</th>
              <th className="px-6 py-3 font-medium">Rider</th>
              <th className="px-6 py-3 font-medium">Severity</th>
              <th className="px-6 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No confirmed telemetry incidents logged.
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(incident.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{incident.rider.name}</div>
                    <div className="text-xs text-slate-500">Helmet: {incident.helmet.helmetId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        incident.severity === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : incident.severity === "HIGH"
                          ? "bg-orange-100 text-orange-800"
                          : incident.severity === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800"
                          : incident.severity === "LOW"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {incident.severity}
                    </span>
                    {incident.accident && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ACCIDENT
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">
                      Impact: {incident.impact ? `${incident.impact.toFixed(2)}G` : "N/A"}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
