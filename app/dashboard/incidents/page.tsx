import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export default async function IncidentsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    return null;
  }

  const incidents = await prisma.incident.findMany({
    where: { companyId: session.user.companyId },
    include: {
      rider: true,
      helmet: true
    },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Incident Reports</h2>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No incidents detected. System is clear.
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{new Date(incident.timestamp).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{incident.rider.name}</div>
                    <div className="text-xs text-slate-500">Helmet: {incident.helmet.helmetId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${incident.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''}
                      ${incident.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' : ''}
                      ${incident.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${incident.severity === 'LOW' ? 'bg-blue-100 text-blue-800' : ''}
                      ${incident.severity === 'NONE' ? 'bg-slate-100 text-slate-800' : ''}
                    `}>
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
                      Impact: {incident.impact ? `${incident.impact.toFixed(2)}G` : 'N/A'}
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
