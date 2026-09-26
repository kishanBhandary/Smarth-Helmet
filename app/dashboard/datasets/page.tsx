import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Upload, FileBox } from "lucide-react";

export default async function DatasetsPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    return null;
  }

  const datasets = await prisma.dataset.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Datasets</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your uploaded Excel data for rider and helmet telemetry.</p>
        </div>
        <Link 
          href="/dashboard/datasets/upload"
          className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Dataset
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Records</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valid / Invalid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Uploaded At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <FileBox className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-medium text-slate-700">No datasets uploaded</p>
                  <p className="text-sm mt-1">Get started by uploading your first CSV or Excel file.</p>
                </td>
              </tr>
            ) : (
              datasets.map((dataset) => (
                <tr key={dataset.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{dataset.fileName}</div>
                    <div className="text-xs text-slate-500">By: {dataset.uploadedBy}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${dataset.status === 'PROCESSED' ? 'bg-green-100 text-green-800' : ''}
                      ${dataset.status === 'FAILED' ? 'bg-red-100 text-red-800' : ''}
                      ${dataset.status === 'PROCESSING' || dataset.status === 'VALIDATING' ? 'bg-blue-100 text-blue-800' : ''}
                      ${dataset.status === 'UPLOADED' ? 'bg-slate-100 text-slate-800' : ''}
                    `}>
                      {dataset.status}
                    </span>
                    {dataset.errorMessage && (
                       <div className="text-xs text-red-500 mt-1 truncate max-w-[200px]" title={dataset.errorMessage}>
                         {dataset.errorMessage}
                       </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{dataset.totalRecords.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-green-600 font-medium">{dataset.validRecords.toLocaleString()}</div>
                    <div className="text-xs text-red-500">{dataset.invalidRecords.toLocaleString()} errors</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500">{new Date(dataset.createdAt).toLocaleString()}</div>
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
