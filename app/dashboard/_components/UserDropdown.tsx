"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";

interface UserDropdownProps {
  name: string;
  role: string;
  initials: string;
}

export default function UserDropdown({ name, role, initials }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative ml-4" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none"
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-600 text-white font-medium text-sm shadow-sm ring-2 ring-white hover:ring-blue-100 transition-all">
          {initials}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate capitalize mt-0.5">
              {role.toLowerCase().replace("_", " ")}
            </p>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <UserIcon className="mr-3 h-4 w-4 text-slate-400" />
              Your Profile
            </button>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4 text-red-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
