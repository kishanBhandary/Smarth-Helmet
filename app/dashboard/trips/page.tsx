import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export default async function TripsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    return null;
  }

  const trips = await prisma.trip.findMany({
    where: { companyId: session.user.companyId },
    include: {
      rider: true,
      helmet: true
    },
    orderBy: { startTime: 'desc' },
    take: 50 // Limit for performance
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Trips Log</h2>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trip ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Helmet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Start Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration / Distance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No trips logged yet. Upload a dataset to view trips.
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{trip.tripId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{trip.rider.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">{trip.helmet.helmetId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">{new Date(trip.startTime).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {trip.duration ? `${Math.floor(trip.duration / 60)}m ${trip.duration % 60}s` : 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {trip.distance ? `${trip.distance.toFixed(2)} km` : '-'}
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
