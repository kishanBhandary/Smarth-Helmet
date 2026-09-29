import prisma from "@/lib/prisma";
import DashboardHeader from "./_components/DashboardHeader";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Database, 
  Upload, 
  Users, 
  HardHat, 
  Route, 
  AlertTriangle, 
  BarChart3, 
  MapPin, 
  FileText, 
  Settings
} from "lucide-react";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  let companyName = "Unknown Company";
  if (session?.user?.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true }
    });
    if (company) companyName = company.name;
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 z-30">
        <div className="pt-6 px-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">AI SMARTDATA</h1>
          <p className="text-xs text-slate-500 mt-1">Company Dashboard</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-6 scrollbar-thin">
          <div>
            <nav className="space-y-1">
              <Link href="/dashboard" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700">
                <LayoutDashboard className="mr-3 h-5 w-5 text-blue-600" />
                Dashboard
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Data
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/datasets" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <Database className="mr-3 h-5 w-5 text-slate-400" />
                Datasets
              </Link>
              <Link href="/dashboard/datasets/upload" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <Upload className="mr-3 h-5 w-5 text-slate-400" />
                Upload Dataset
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monitoring
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/riders" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <Users className="mr-3 h-5 w-5 text-slate-400" />
                Riders
              </Link>
              <Link href="/dashboard/helmets" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <HardHat className="mr-3 h-5 w-5 text-slate-400" />
                Helmets
              </Link>
              <Link href="/dashboard/trips" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <Route className="mr-3 h-5 w-5 text-slate-400" />
                Trips
              </Link>
              <Link href="/dashboard/incidents" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <AlertTriangle className="mr-3 h-5 w-5 text-slate-400" />
                Incidents
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Analytics
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/analytics" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <BarChart3 className="mr-3 h-5 w-5 text-slate-400" />
                Safety Analytics
              </Link>
              <Link href="/dashboard/analytics/location" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <MapPin className="mr-3 h-5 w-5 text-slate-400" />
                Location Analysis
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              System
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/reports" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <FileText className="mr-3 h-5 w-5 text-slate-400" />
                Reports
              </Link>
              <Link href="/dashboard/employees" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <Users className="mr-3 h-5 w-5 text-slate-400" />
                Team
              </Link>
              <Link href="/dashboard/settings" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors">
                <Settings className="mr-3 h-5 w-5 text-slate-400" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <DashboardHeader user={session?.user} companyName={companyName} />
        
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
