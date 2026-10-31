import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import DashboardClient, { DashboardData } from "./_components/DashboardClient";
import { Suspense } from "react";

export default async function DashboardPage(props: {
  searchParams?: Promise<{ range?: string }> | { range?: string };
}) {
  const searchParams = (await props.searchParams) || {};
  const session = await auth();
  const companyId = session?.user?.companyId;

  if (!companyId) return null;

  const days = parseInt(searchParams.range || "30");
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);

  // Parallel database aggregates strictly scoped to companyId
  const [
    totalRiders,
    totalHelmets,
    totalTrips,
    totalDatasets,
    totalRecords,
    totalIncidents,
    predictedAccidents,
    predictedNoAccidents,
    severityCrit,
    severityHi,
    severityMed,
    severityLo,
    severityNone,
    probLt25,
    prob25to50,
    prob50to75,
    probGte75,
  ] = await Promise.all([
    prisma.rider.count({ where: { companyId } }),
    prisma.helmet.count({ where: { companyId } }),
    prisma.trip.count({ where: { companyId } }),
    prisma.dataset.count({ where: { companyId } }),
    prisma.helmetDataRecord.count({ where: { companyId } }),
    prisma.incident.count({ where: { companyId } }),
    prisma.prediction.count({ where: { companyId, accidentPrediction: true } }),
    prisma.prediction.count({ where: { companyId, accidentPrediction: false } }),
    prisma.prediction.count({
      where: { companyId, severityPrediction: "CRITICAL" },
    }),
    prisma.prediction.count({
      where: { companyId, severityPrediction: "HIGH" },
    }),
    prisma.prediction.count({
      where: { companyId, severityPrediction: "MEDIUM" },
    }),
    prisma.prediction.count({
      where: { companyId, severityPrediction: "LOW" },
    }),
    prisma.prediction.count({
      where: { companyId, severityPrediction: "NONE" },
    }),
    prisma.prediction.count({
      where: { companyId, riskScore: { lt: 25 } },
    }),
    prisma.prediction.count({
      where: { companyId, riskScore: { gte: 25, lt: 50 } },
    }),
    prisma.prediction.count({
      where: { companyId, riskScore: { gte: 50, lt: 75 } },
    }),
    prisma.prediction.count({
      where: { companyId, riskScore: { gte: 75 } },
    }),
  ]);

  // High severity count (Critical + High)
  const highSeverityCount = severityCrit + severityHi;

  // Chart trend data over selected days
  const recentPredictions = await prisma.prediction.findMany({
    where: { companyId, createdAt: { gte: targetDate } },
    select: { createdAt: true, accidentPrediction: true, severityPrediction: true },
  });

  const recentTrips = await prisma.trip.findMany({
    where: { companyId, startTime: { gte: targetDate } },
    select: { startTime: true },
  });

  const chartDataMap = new Map<string, any>();
  const limit = Math.min(days, 30);
  for (let i = limit - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    chartDataMap.set(dateStr, {
      date: dateStr,
      incidents: 0,
      trips: 0,
      accidents: 0,
      highSeverity: 0,
    });
  }

  recentPredictions.forEach((p) => {
    const dateStr = p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (chartDataMap.has(dateStr)) {
      const entry = chartDataMap.get(dateStr);
      entry.incidents++;
      if (p.accidentPrediction) entry.accidents++;
      if (p.severityPrediction === "HIGH" || p.severityPrediction === "CRITICAL") {
        entry.highSeverity++;
      }
    }
  });

  recentTrips.forEach((t) => {
    const dateStr = t.startTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (chartDataMap.has(dateStr)) {
      chartDataMap.get(dateStr).trips++;
    }
  });

  // Recent Predictions / Incidents table
  const recentPredList = await prisma.prediction.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      rider: { select: { name: true, riderId: true } },
      helmet: { select: { helmetId: true } },
      trip: { select: { tripId: true } },
      record: { select: { location: true } },
    },
  });

  const mappedRecent = recentPredList.map((p) => ({
    id: p.id,
    incidentId: p.id,
    riderId: p.rider?.name || (p.rider?.riderId ? `Rider ${p.rider.riderId}` : "Telemetry Rider"),
    helmetId: p.helmet?.helmetId,
    tripId: p.trip?.tripId || "Trip 1",
    severity: p.severityPrediction || "NONE",
    location: p.record?.location || "En route",
    timestamp: p.createdAt,
    status: p.accidentPrediction ? "AI Accident" : "Safe",
    probability: p.riskScore ?? undefined,
    isPredicted: true,
  }));

  // Top incident locations from helmet data records with accidents or high probability
  const topLocationsRaw = await prisma.helmetDataRecord.groupBy({
    by: ["location"],
    where: {
      companyId,
      location: { not: null },
    },
    _count: true,
    orderBy: { _count: { location: "desc" } },
    take: 5,
  });

  const topLocations = topLocationsRaw
    .filter((l) => l.location)
    .map((l) => ({
      location: l.location!,
      count: l._count,
    }));

  const data: DashboardData = {
    stats: {
      totalRiders,
      totalHelmets,
      totalTrips,
      totalDatasets,
      totalRecords,
      totalIncidents,
      highSeverity: highSeverityCount,
      predictedAccidents,
      predictedNoAccidents,
    },
    chartData: Array.from(chartDataMap.values()),
    riskData: {
      low: severityLo + severityNone,
      medium: severityMed,
      high: severityHi + severityCrit,
    },
    severityDistribution: {
      critical: severityCrit,
      high: severityHi,
      medium: severityMed,
      low: severityLo,
      none: severityNone,
    },
    probabilityDistribution: {
      veryLow: probLt25,
      moderate: prob25to50,
      high: prob50to75,
      severe: probGte75,
    },
    recentIncidents: mappedRecent,
    topLocations,
  };

  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      }
    >
      <DashboardClient data={data} />
    </Suspense>
  );
}
