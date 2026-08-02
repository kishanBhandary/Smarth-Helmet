"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet default icon fix
const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  center: [number, number];
}

// Subcomponent to handle programmatically updating map center when coordinates change
function ChangeMapView({ center }: MapViewProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface MapProps {
  locations: Array<{ latitude: number; longitude: number; speed?: number; timestamp: string }>;
  ongoing: boolean;
}

export default function RiderMap({ locations, ongoing }: MapProps) {
  const defaultCenter: [number, number] = [12.9141, 74.8560]; // Mangalore, Karnataka, India fallback
  const [browserLocation, setBrowserLocation] = useState<[number, number] | null>(null);
  const [manualLocation, setManualLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  
  // Query browser location
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBrowserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Browser geolocation permission denied or unavailable:", error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const points: [number, number][] = locations.map((loc) => [loc.latitude, loc.longitude]);
  
  // Decide Map Center: Manual Pin -> Active GPS logs -> Browser Geolocation -> Fallback
  const center: [number, number] = manualLocation
    ? manualLocation
    : (points.length > 0 
      ? points[points.length - 1] 
      : (browserLocation || defaultCenter));

  const isUsingBrowserLocation = points.length === 0 && browserLocation !== null && manualLocation === null;
  const isUsingManualMangalore = manualLocation !== null && manualLocation[0] === 12.9141;

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-white/10 bg-slate-900">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[300px]"
      >
        {mapStyle === "streets" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        <ChangeMapView center={center} />
        
        {points.length > 0 ? (
          <>
            <Polyline
              positions={points}
              color={mapStyle === "streets" ? "#000000" : "#ffffff"}
              weight={4}
              opacity={0.8}
              dashArray="2, 6"
            />
            <Marker position={center}>
              <Popup>
                <div className="text-xs text-slate-900">
                  <p className="font-bold">Active Rider</p>
                  <p>Speed: {locations[locations.length - 1].speed || 0} km/h</p>
                </div>
              </Popup>
            </Marker>
          </>
        ) : (
          <Marker position={center}>
            <Popup>
              <div className="text-xs text-slate-900">
                <p className="font-bold">
                  {isUsingManualMangalore 
                    ? "Mangalore (Pinned)" 
                    : (isUsingBrowserLocation ? "Your Location" : "Mangalore, Karnataka (Default)")}
                </p>
                <p className="text-slate-600">
                  {isUsingManualMangalore 
                    ? "Manually pinned to Mangalore" 
                    : (isUsingBrowserLocation 
                      ? "Browser reported position. (Note: Internet Service Providers/cell towers in Mangalore often route traffic and report locations via Mysore gateways)." 
                      : "Activate helmet or grant browser location permission")}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map visual badge overlay */}
      <div className="absolute top-3 right-3 z-[400] glass px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${ongoing ? "bg-cyan-400 animate-pulse" : (isUsingBrowserLocation ? "bg-emerald-500 animate-pulse" : "bg-slate-400")}`}></span>
        <span>
          {ongoing 
            ? "LIVE POSITIONING" 
            : (isUsingManualMangalore 
              ? "PINNED MANGALORE" 
              : (isUsingBrowserLocation ? "CURRENT LOCATION" : "ROUTE ARCHIVE"))}
        </span>
      </div>

      {/* Quick Location Snappers (Top Left beneath Leaflet Zoom) */}
      <div className="absolute top-16 left-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={() => {
            setManualLocation([12.9141, 74.8560]);
          }}
          title="Snap to Mangalore"
          className="w-8 h-8 bg-white text-slate-900 border border-slate-300 rounded-md shadow-md hover:bg-slate-100 transition flex items-center justify-center font-bold text-xs"
        >
          MLR
        </button>
        {(browserLocation || manualLocation) && (
          <button
            onClick={() => {
              setManualLocation(null);
            }}
            title="Reset to Live GPS"
            className="w-8 h-8 bg-white text-slate-900 border border-slate-300 rounded-md shadow-md hover:bg-slate-100 transition flex items-center justify-center text-xs"
          >
            🧭
          </button>
        )}
      </div>

      {/* Map style toggle overlay (Streets vs Satellite) */}
      <div className="absolute bottom-3 left-3 z-[400] glass p-1 rounded-lg border border-white/10 flex gap-1 text-xs">
        <button
          onClick={() => setMapStyle("streets")}
          className={`px-2.5 py-1 rounded-md transition font-semibold ${mapStyle === "streets" ? "bg-black text-white" : "text-slate-600 hover:text-slate-900"}`}
        >
          Streets
        </button>
        <button
          onClick={() => setMapStyle("satellite")}
          className={`px-2.5 py-1 rounded-md transition font-semibold ${mapStyle === "satellite" ? "bg-black text-white" : "text-slate-600 hover:text-slate-900"}`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
