import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export default async function RidersPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    return null;
  }

  const riders = await prisma.rider.findMany({
    where: { companyId: session.user.companyId },
    include: {
      helmet: true,
      trips: {
        select: {
          helmet: { select: { helmetId: true } },
        },
        take: 1,
        orderBy: { startTime: "desc" },
      },
      _count: {
        select: { trips: true, records: true },
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Riders & Users Directory</h2>
          <p className="text-sm text-slate-500 mt-1">
            Registered riders, fleet drivers, and active helmet telematics users.
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rider / User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Helmet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trips</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {riders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No riders found. Upload an Excel or CSV dataset to automatically register fleet riders and users.
                </td>
              </tr>
            ) : (
              riders.map((rider) => {
                const helmetId = rider.helmet?.helmetId || rider.trips[0]?.helmet?.helmetId || "Unassigned";
                return (
                  <tr key={rider.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{rider.riderId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{rider.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        helmetId !== "Unassigned" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {helmetId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {rider._count.trips} trip{rider._count.trips === 1 ? "" : "s"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
