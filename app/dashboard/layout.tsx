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
  Settings,
  LogOut
} from "lucide-react";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white">AI SMARTDATA</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overview
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Dashboard
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Data
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/datasets" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <Database className="mr-3 h-5 w-5" />
                Datasets
              </Link>
              <Link href="/dashboard/datasets/upload" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <Upload className="mr-3 h-5 w-5" />
                Upload Dataset
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monitoring
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/riders" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <Users className="mr-3 h-5 w-5" />
                Riders
              </Link>
              <Link href="/dashboard/helmets" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <HardHat className="mr-3 h-5 w-5" />
                Helmets
              </Link>
              <Link href="/dashboard/trips" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <Route className="mr-3 h-5 w-5" />
                Trips
              </Link>
              <Link href="/dashboard/incidents" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <AlertTriangle className="mr-3 h-5 w-5" />
                Incidents
              </Link>
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Analytics
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/analytics" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <BarChart3 className="mr-3 h-5 w-5" />
                Safety Analytics
              </Link>
              <Link href="/dashboard/analytics/location" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <MapPin className="mr-3 h-5 w-5" />
                Location Analysis
              </Link>
            </nav>
          </div>

          <div>
            <nav className="space-y-1">
              <Link href="/dashboard/reports" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <FileText className="mr-3 h-5 w-5" />
                Reports
              </Link>
              <Link href="/dashboard/employees" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <Users className="mr-3 h-5 w-5" />
                Team
              </Link>
              <Link href="/dashboard/settings" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 hover:text-white">
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-white truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {session?.user?.role?.replace("_", " ")}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
            className="mt-4"
          >
            <button className="flex w-full items-center px-3 py-2 text-sm font-medium text-slate-400 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800 truncate">
            Company Workspace
          </h1>
          <div className="flex items-center">
            {/* Additional header items could go here */}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-50 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
