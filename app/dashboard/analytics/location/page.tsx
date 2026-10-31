import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import LocationMapClient from "@/components/LocationMapClient";
import { MapPin, Navigation, AlertTriangle, ShieldCheck } from "lucide-react";

export default async function LocationAnalyticsPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) return null;

  // Fetch telemetry records with valid GPS coordinates for this company
  const gpsRecords = await prisma.helmetDataRecord.findMany({
    where: {
      companyId,
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { timestamp: "desc" },
    take: 200,
    include: {
      rider: { select: { name: true, riderId: true } },
      helmet: { select: { helmetId: true } },
      predictions: {
        select: {
          predictedAccident: true,
          accidentPrediction: true,
          predictedSeverity: true,
          severityPrediction: true,
          riskScore: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Also query recent predictions with location
  const predictedIncidents = await prisma.prediction.findMany({
    where: {
      companyId,
      accidentPrediction: true,
    },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      rider: { select: { name: true, riderId: true } },
      record: { select: { latitude: true, longitude: true, location: true, speed: true } },
    },
  });

  const mapLocations = gpsRecords.map((r) => {
    const pred = r.predictions?.[0];
    const isAccident = Boolean(pred?.accidentPrediction || pred?.predictedAccident === "Yes" || r.accident);
    const severity = pred?.predictedSeverity || pred?.severityPrediction || r.severity || "NONE";

    return {
      latitude: r.latitude!,
      longitude: r.longitude!,
      speed: r.speed || 0,
      timestamp: r.timestamp.toISOString(),
      locationName: r.location || "Telemetry coordinate",
      severity,
      accident: isAccident,
      riderName: r.rider?.name || `Rider ${r.rider?.riderId || r.riderId}`,
      helmetId: r.helmet?.helmetId,
      probability: pred?.riskScore || 0,
      tiltAngle: r.tiltAngle || 0,
      weather: r.weather || undefined,
      roadCondition: r.roadCondition || undefined,
    };
  });

  const incidentsWithGps = predictedIncidents.filter(
    (p) => p.record?.latitude && p.record?.longitude
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Geospatial Incident Mapping</h2>
          <p className="text-sm text-slate-500 mt-1">
            Visual telemetry map and GPS location distribution of evaluated fleet rides.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-sm">
            <Navigation className="h-3.5 w-3.5 text-blue-600" />
            {mapLocations.length} Pinned GPS Points
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-semibold shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            {incidentsWithGps.length} AI Incidents
          </span>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <LocationMapClient 
          locations={mapLocations} 
          ongoing={false} 
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        />
      </div>

      {/* Location Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">GPS Telemetry Incident Log</h3>
            <p className="text-xs text-slate-500">Recent GPS coordinates linked to company fleet records</p>
          </div>
          <MapPin className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Rider</th>
                <th className="px-6 py-3">Coordinates (Lat, Lon)</th>
                <th className="px-6 py-3">Location Name</th>
                <th className="px-6 py-3">Speed</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {mapLocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No GPS coordinates found in uploaded datasets. Ensure records contain valid GPS or Latitude/Longitude values.
                  </td>
                </tr>
              ) : (
                mapLocations.slice(0, 10).map((loc, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(loc.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">{loc.riderName}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">{loc.locationName}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{loc.speed} km/h</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          loc.accident ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {loc.accident ? "Accident Detected" : "Nominal"}
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
