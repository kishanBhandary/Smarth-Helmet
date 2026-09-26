import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;
  
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId }
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Workspace Settings</h2>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Company Profile</h3>
          <p className="text-sm text-slate-500">Manage your company's core configuration and identity.</p>
        </div>
        
        <div className="pt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Company Name</label>
            <input 
              type="text" 
              disabled 
              value={company?.name || "Company Name"} 
              className="border border-slate-300 rounded-md p-2.5 bg-slate-50 text-slate-600 text-sm w-full outline-none" 
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Official Communication Email</label>
            <input 
              type="email" 
              disabled 
              value={company?.officialEmail || session.user.email || ""} 
              className="border border-slate-300 rounded-md p-2.5 bg-slate-50 text-slate-600 text-sm w-full outline-none" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Contact Phone</label>
            <input 
              type="tel" 
              disabled 
              value={company?.phone || ""} 
              className="border border-slate-300 rounded-md p-2.5 bg-slate-50 text-slate-600 text-sm w-full outline-none" 
              placeholder="No phone number provided"
            />
          </div>
        </div>

        <div className="pt-4">
          <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors opacity-50 cursor-not-allowed">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
