import { Bell, ChevronDown } from "lucide-react";
import { User } from "next-auth";
import UserDropdown from "./UserDropdown";

export default function DashboardHeader({ user, companyName }: { user?: User, companyName?: string }) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  const name = user?.name || "User";
  const role = user?.role || "Admin";
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm sticky top-0 z-20">
      <div />
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex text-sm text-slate-500">
          {currentDate}
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-700 leading-none">{companyName || 'Unknown Company'}</span>
            <span className="text-[10px] text-slate-500 mt-1 uppercase">ID: {user?.companyId || 'CMP-000'}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
        </div>

        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          <button className="text-slate-400 hover:text-slate-600 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>
          
          <UserDropdown name={name} role={role} initials={initials} />
        </div>
      </div>
    </header>
  );
}
