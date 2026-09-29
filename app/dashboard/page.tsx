import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import DashboardClient, { DashboardData } from "./_components/DashboardClient";
import { Suspense } from "react";

export default async function DashboardPage(props: { searchParams?: Promise<{ range?: string }> | { range?: string } }) {
  const searchParams = await props.searchParams || {};
  const session = await auth();
  const companyId = session?.user?.companyId;

  if (!companyId) return null;

  const days = parseInt(searchParams.range || "30");

  // Basic Stats
  const [
    totalRiders,
    totalHelmets,
    totalTrips,
    totalDatasets,
    totalIncidents,
    highSeverityIncidents
  ] = await Promise.all([
    prisma.rider.count({ where: { companyId } }),
    prisma.helmet.count({ where: { companyId } }),
    prisma.trip.count({ where: { companyId } }),
    prisma.dataset.count({ where: { companyId } }),
    prisma.incident.count({ where: { companyId } }),
    prisma.incident.count({
      where: {
        companyId,
        severity: { in: ["HIGH", "CRITICAL"] }
      }
    })
  ]);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);
  
  const recentIncidentsRaw = await prisma.incident.findMany({
    where: { companyId, timestamp: { gte: targetDate } },
    select: { timestamp: true, severity: true, accident: true }
  });

  const recentTripsRaw = await prisma.trip.findMany({
    where: { companyId, startTime: { gte: targetDate } },
    select: { startTime: true }
  });

  const chartDataMap = new Map<string, any>();
  const limit = Math.min(days, 30); // only show up to 30 days on chart to avoid crowding
  for(let i = limit - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    chartDataMap.set(dateStr, { date: dateStr, incidents: 0, trips: 0, accidents: 0, highSeverity: 0 });
  }

  recentIncidentsRaw.forEach(inc => {
    const dateStr = inc.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if(chartDataMap.has(dateStr)) {
      const entry = chartDataMap.get(dateStr);
      entry.incidents++;
      if (inc.accident) entry.accidents++;
      if (inc.severity === "HIGH" || inc.severity === "CRITICAL") entry.highSeverity++;
    }
  });

  recentTripsRaw.forEach(trip => {
    const dateStr = trip.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if(chartDataMap.has(dateStr)) {
      chartDataMap.get(dateStr).trips++;
    }
  });

  // Risk Distribution (for the selected range)
  const riskLow = await prisma.incident.count({ where: { companyId, timestamp: { gte: targetDate }, severity: { in: ["NONE", "LOW"] } } });
  const riskMedium = await prisma.incident.count({ where: { companyId, timestamp: { gte: targetDate }, severity: "MEDIUM" } });
  const riskHigh = await prisma.incident.count({ where: { companyId, timestamp: { gte: targetDate }, severity: { in: ["HIGH", "CRITICAL"] } } });

  // Recent Incidents Table
  const recentIncidents = await prisma.incident.findMany({
    where: { companyId },
    orderBy: { timestamp: 'desc' },
    take: 5,
    include: {
      rider: { select: { name: true } },
      trip: { select: { tripId: true } }
    }
  });

  const mappedRecent = recentIncidents.map(inc => ({
    id: inc.id,
    incidentId: inc.id,
    riderId: inc.rider?.name || "Unknown",
    tripId: inc.trip?.tripId || "Unknown",
    severity: inc.severity,
    location: inc.location || "Unknown",
    timestamp: inc.timestamp,
    status: "Open"
  }));

  const incidentsWithLocation = await prisma.incident.groupBy({
    by: ['location'],
    where: { companyId, location: { not: null }, timestamp: { gte: targetDate } },
    _count: true,
    orderBy: { _count: { location: 'desc' } },
    take: 5
  });
  
  const topLocations = incidentsWithLocation.map(loc => ({
    location: loc.location || "Unknown",
    count: loc._count
  }));

  const data: DashboardData = {
    stats: {
      totalRiders,
      totalHelmets,
      totalTrips,
      totalDatasets,
      totalIncidents,
      highSeverity: highSeverityIncidents
    },
    chartData: Array.from(chartDataMap.values()),
    riskData: {
      low: riskLow,
      medium: riskMedium,
      high: riskHigh
    },
    recentIncidents: mappedRecent,
    topLocations
  };

  return (
    <Suspense fallback={<div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-slate-200 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-slate-200 rounded col-span-1"></div></div></div></div></div>}>
      <DashboardClient data={data} />
    </Suspense>
  );
}
