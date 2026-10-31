"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import GoogleMapComponent, { MapPoint } from "./GoogleMapComponent";
import { Globe, Map, Sparkles } from "lucide-react";

const LeafletDynamicMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] flex items-center justify-center bg-slate-100 rounded-xl text-slate-400">
      Loading OpenStreetMap Leaflet layer...
    </div>
  ),
});

export interface LocationRecordPoint extends MapPoint {}

interface LocationMapClientProps {
  locations: LocationRecordPoint[];
  ongoing?: boolean;
  apiKey?: string;
}

export default function LocationMapClient({ locations, ongoing = false, apiKey }: LocationMapClientProps) {
  const hasGoogleKey = Boolean(apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const [mapProvider, setMapProvider] = useState<"google" | "leaflet">(
    hasGoogleKey ? "google" : "leaflet"
  );

  return (
    <div className="space-y-3">
      {/* Map Engine Selector Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-blue-600" />
            Active Map Engine:
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {mapProvider === "google" ? "Google Maps JavaScript API" : "OpenStreetMap (Leaflet)"}
          </span>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setMapProvider("google")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              mapProvider === "google"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            Google Maps
          </button>
          <button
            type="button"
            onClick={() => setMapProvider("leaflet")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              mapProvider === "leaflet"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Map className="h-3 w-3 text-slate-500" />
            Leaflet / OSM
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="w-full rounded-xl overflow-hidden shadow-xs border border-slate-200 bg-slate-50">
        {mapProvider === "google" ? (
          <GoogleMapComponent locations={locations} ongoing={ongoing} apiKey={apiKey} height="540px" />
        ) : (
          <LeafletDynamicMap locations={locations} ongoing={ongoing} />
        )}
      </div>
    </div>
  );
}
