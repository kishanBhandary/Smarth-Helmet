"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { 
  MapPin, 
  Layers, 
  Compass, 
  Navigation, 
  Car, 
  Maximize2, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Flame,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";

export interface MapPoint {
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
  locationName?: string;
  severity?: string;
  accident?: boolean;
  riderName?: string;
  helmetId?: string;
  probability?: number;
  tiltAngle?: number;
  weather?: string;
  roadCondition?: string;
}

interface GoogleMapComponentProps {
  locations: MapPoint[];
  ongoing?: boolean;
  apiKey?: string;
  defaultZoom?: number;
  height?: string;
}

declare global {
  interface Window {
    google?: any;
    initGoogleMapCallback?: () => void;
  }
}

export default function GoogleMapComponent({
  locations,
  ongoing = false,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  defaultZoom = 14,
  height = "560px",
}: GoogleMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "accidents" | "critical">("all");
  const [selectedAccidentIndex, setSelectedAccidentIndex] = useState<number | null>(null);
  const [browserPos, setBrowserPos] = useState<{ lat: number; lng: number } | null>(null);

  const defaultCenter = { lat: 12.9141, lng: 74.856 }; // Mangalore default

  // Filter locations based on active filter
  const filteredLocations = useMemo(() => {
    if (filterMode === "accidents") {
      return locations.filter((l) => l.accident);
    }
    if (filterMode === "critical") {
      return locations.filter(
        (l) => l.accident && (l.severity?.toUpperCase() === "CRITICAL" || l.severity?.toUpperCase() === "HIGH")
      );
    }
    return locations;
  }, [locations, filterMode]);

  const accidentList = useMemo(() => {
    return locations.filter((l) => l.accident);
  }, [locations]);

  // Load Google Maps JavaScript API script
  useEffect(() => {
    const key = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setLoadError("Google Maps API Key not detected. Please verify NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.");
      return;
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script already appended
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      setLoadError("Failed to load Google Maps JavaScript API. Please check your network or API key.");
    };

    document.head.appendChild(script);
  }, [apiKey]);

  // Query browser location
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBrowserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn("Browser geolocation prompt declined:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Initialize Map Instance
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const initialCenter = locations.length > 0
        ? { lat: locations[0].latitude, lng: locations[0].longitude }
        : (browserPos || defaultCenter);

      const map = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: defaultZoom,
        mapTypeId: mapType,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        styles: [
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapInstanceRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }
  }, [isLoaded, locations, defaultZoom, browserPos]);

  // Update Map Type
  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Toggle Traffic Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !trafficLayerRef.current) return;
    if (showTraffic) {
      trafficLayerRef.current.setMap(mapInstanceRef.current);
    } else {
      trafficLayerRef.current.setMap(null);
    }
  }, [showTraffic]);

  // Helper to create custom SVG marker icon
  const getMarkerIcon = useCallback((loc: MapPoint) => {
    const isAccident = Boolean(loc.accident);
    const severity = (loc.severity || "").toUpperCase();

    if (isAccident || severity === "CRITICAL" || severity === "HIGH") {
      // Danger Red Marker with Warning Icon
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
          <defs>
            <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#DC2626" flood-opacity="0.5"/>
            </filter>
          </defs>
          <path d="M22 0C10 0 0 10 0 22c0 16 22 30 22 30s22-14 22-30C44 10 34 0 22 0z" fill="#DC2626" stroke="#FFFFFF" stroke-width="2.5" filter="url(#shadow)"/>
          <circle cx="22" cy="21" r="13" fill="#FFFFFF"/>
          <text x="22" y="26" font-size="14" text-anchor="middle" dominant-baseline="middle">⚠️</text>
        </svg>
      `;
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new window.google.maps.Size(44, 52),
        anchor: new window.google.maps.Point(22, 52),
      };
    } else if (severity === "MEDIUM" || severity === "LOW") {
      // Amber Caution Marker
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46">
          <path d="M19 0C8.5 0 0 8.5 0 19c0 14 19 27 19 27s19-13 19-27C38 8.5 29.5 0 19 0z" fill="#D97706" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="19" cy="18" r="11" fill="#FFFFFF"/>
          <text x="19" y="22" font-size="11" text-anchor="middle" dominant-baseline="middle">⚡</text>
        </svg>
      `;
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new window.google.maps.Size(38, 46),
        anchor: new window.google.maps.Point(19, 46),
      };
    }

    // Safe Blue Marker
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.8"/>
        <circle cx="16" cy="15" r="9" fill="#FFFFFF"/>
        <circle cx="16" cy="15" r="5" fill="#2563EB"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(32, 40),
      anchor: new window.google.maps.Point(16, 40),
    };
  }, []);

  // Update Markers, Danger Circles, and Polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear previous danger circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    // Clear previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (filteredLocations.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    const pathCoordinates: any[] = [];

    filteredLocations.forEach((loc, idx) => {
      const pos = { lat: loc.latitude, lng: loc.longitude };
      bounds.extend(pos);
      pathCoordinates.push(pos);

      const isAcc = Boolean(loc.accident);
      const sev = (loc.severity || "NONE").toUpperCase();

      // Render red translucent danger perimeter circle for accident locations
      if (isAcc) {
        const circle = new window.google.maps.Circle({
          strokeColor: "#DC2626",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#EF4444",
          fillOpacity: 0.25,
          map: mapInstanceRef.current,
          center: pos,
          radius: 90, // 90 meters danger radius
          zIndex: 100,
        });
        circlesRef.current.push(circle);
      }

      // Accident markers are given top z-index (9999) so they always float above safe telemetry pins
      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: `${loc.riderName || "Rider"} - ${isAcc ? "🚨 ACCIDENT" : "Safe"}`,
        icon: getMarkerIcon(loc),
        zIndex: isAcc ? 9999 + idx : 100 + idx,
        animation: isAcc ? window.google.maps.Animation.DROP : undefined,
      });

      const openInfoWindow = () => {
        const prob = loc.probability !== undefined ? loc.probability.toFixed(1) : undefined;
        const contentString = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; max-width: 280px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 2px solid ${isAcc ? '#FEE2E2' : '#E2E8F0'}; padding-bottom: 6px;">
              <div>
                <strong style="color: #0F172A; font-size: 14px; display: block;">${loc.riderName || "Fleet Rider"}</strong>
                ${loc.helmetId ? `<span style="font-size: 11px; color: #64748B;">Helmet: ${loc.helmetId}</span>` : ""}
              </div>
              <span style="font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 9999px; ${
                isAcc
                  ? "background: #DC2626; color: #FFFFFF; box-shadow: 0 2px 4px rgba(220,38,38,0.3);"
                  : "background: #DCFCE7; color: #166534;"
              }">
                ${isAcc ? "🚨 ACCIDENT" : "✅ SAFE"}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; font-size: 12px; color: #334155; background: ${isAcc ? '#FEF2F2' : '#F8FAFC'}; padding: 8px; rounded: 6px;">
              <div><strong>Speed:</strong> ${loc.speed ?? 0} km/h</div>
              <div><strong>Severity:</strong> <span style="color: ${isAcc ? '#DC2626' : '#2563EB'}; font-weight: bold;">${sev}</span></div>
              ${loc.tiltAngle !== undefined ? `<div><strong>Tilt Angle:</strong> ${loc.tiltAngle}°</div>` : ""}
              ${prob !== undefined ? `<div><strong>AI Probability:</strong> ${prob}%</div>` : ""}
              ${loc.weather ? `<div><strong>Weather:</strong> ${loc.weather}</div>` : ""}
              ${loc.roadCondition ? `<div><strong>Road:</strong> ${loc.roadCondition}</div>` : ""}
            </div>

            ${loc.locationName ? `<div style="font-size: 12px; color: #475569; margin-top: 4px;">📍 <strong>Location:</strong> ${loc.locationName}</div>` : ""}
            <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">🕒 ${new Date(loc.timestamp).toLocaleString()}</div>
          </div>
        `;

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      };

      marker.addListener("click", openInfoWindow);
      markersRef.current.push(marker);
    });

    // Draw route line
    if (pathCoordinates.length > 1 && filterMode === "all") {
      polylineRef.current = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: "#2563EB",
        strokeOpacity: 0.7,
        strokeWeight: 4,
        map: mapInstanceRef.current,
      });
    }

    // Fit bounds to filtered pins
    if (filteredLocations.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 50);
    } else if (filteredLocations.length === 1) {
      mapInstanceRef.current.setCenter({ lat: filteredLocations[0].latitude, lng: filteredLocations[0].longitude });
      mapInstanceRef.current.setZoom(16);
    }
  }, [filteredLocations, filterMode, getMarkerIcon]);

  // Jump to specific accident
  const jumpToLocation = (loc: MapPoint, index: number) => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const pos = { lat: loc.latitude, lng: loc.longitude };
    mapInstanceRef.current.panTo(pos);
    mapInstanceRef.current.setZoom(17);
    setSelectedAccidentIndex(index);

    const marker = markersRef.current.find(
      (m) =>
        Math.abs(m.getPosition()?.lat() - loc.latitude) < 0.0001 &&
        Math.abs(m.getPosition()?.lng() - loc.longitude) < 0.0001
    );

    if (marker) {
      new window.google.maps.event.trigger(marker, "click");
    }
  };

  // Center Handlers
  const handleFitFleet = () => {
    if (!mapInstanceRef.current || filteredLocations.length === 0 || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    filteredLocations.forEach((loc) => bounds.extend({ lat: loc.latitude, lng: loc.longitude }));
    mapInstanceRef.current.fitBounds(bounds, 50);
  };

  const handleCenterUser = () => {
    if (!mapInstanceRef.current || !browserPos || !window.google?.maps) return;
    mapInstanceRef.current.panTo(browserPos);
    mapInstanceRef.current.setZoom(16);
  };

  const handleCenterMangalore = () => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    mapInstanceRef.current.panTo(defaultCenter);
    mapInstanceRef.current.setZoom(14);
  };

  if (loadError) {
    return (
      <div 
        style={{ height }}
        className="w-full rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-300"
      >
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <h4 className="text-base font-semibold text-white">Google Maps Error</h4>
        <p className="text-xs text-slate-400 max-w-md mt-1">{loadError}</p>
        <p className="text-xs text-slate-500 mt-2">
          Verify that <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> is enabled for Maps JavaScript API in Google Cloud Console.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Filter Bar: Pinpoint Accidents Immediately */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            Display Filter:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Telemetry ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("accidents")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === "accidents"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Accidents Only ({accidentList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("critical")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === "critical"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Critical / High Severity ({locations.filter(l => l.accident && (l.severity === "CRITICAL" || l.severity === "HIGH")).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block shadow-xs" />
            Accident Event
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs" />
            Nominal Telemetry
          </span>
        </div>
      </div>

      {/* Main Google Maps Viewport */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-slate-200" style={{ height }}>
        <div ref={mapRef} className="w-full h-full bg-slate-100" />

        {/* Loading Overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-500 z-10">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Connecting to Google Maps JavaScript API...
            </div>
          </div>
        )}

        {/* Top Left: Controls & Quick Location Snaps */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-sm p-1.5 rounded-lg shadow-md border border-slate-200 flex flex-col gap-1.5">
            <button
              onClick={handleFitFleet}
              title="Fit All Fleet Points"
              className="w-8 h-8 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleCenterUser}
              title="Snap to Current Browser GPS"
              className="w-8 h-8 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold transition-colors"
            >
              <Navigation className="h-4 w-4 text-blue-600" />
            </button>
            <button
              onClick={handleCenterMangalore}
              title="Snap to Mangalore (MLR Hub)"
              className="w-8 h-8 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
            >
              MLR
            </button>
          </div>
        </div>

        {/* Top Right: Status Badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-medium flex items-center gap-2 text-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full ${accidentList.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <span>
              {accidentList.length > 0 
                ? `${accidentList.length} AI Accidents Detected` 
                : "All Rides Nominal"}
            </span>
          </div>
        </div>

        {/* Bottom Left: Map Layer Type & Live Traffic Switcher */}
        <div className="absolute bottom-4 left-3 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg shadow-md border border-slate-200">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMapType("roadmap")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                mapType === "roadmap"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Roadmap
            </button>
            <button
              onClick={() => setMapType("satellite")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                mapType === "satellite"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType("terrain")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                mapType === "terrain"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Terrain
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              showTraffic
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Toggle Google Live Traffic Layer"
          >
            <Car className="h-3.5 w-3.5" />
            <span>Traffic</span>
          </button>
        </div>

        {/* Bottom Right: Powered by Google */}
        <div className="absolute bottom-4 right-14 z-20 pointer-events-none">
          <span className="bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-slate-500 font-medium shadow-xs">
            Powered by Google Maps
          </span>
        </div>
      </div>

      {/* Quick Jump to Accidents Drawer */}
      {accidentList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
              <h4 className="text-sm font-bold text-slate-900">
                AI Detected Accident Coordinates ({accidentList.length})
              </h4>
            </div>
            <span className="text-xs text-slate-500">Click any card to zoom directly to the accident site on Google Maps</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {accidentList.map((acc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpToLocation(acc, i)}
                className={`text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                  selectedAccidentIndex === i
                    ? "bg-red-50 border-red-300 shadow-xs"
                    : "bg-slate-50/60 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <div className="space-y-0.5 overflow-hidden">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span>{acc.riderName || "Rider"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    📍 {acc.locationName || `${acc.latitude.toFixed(4)}, ${acc.longitude.toFixed(4)}`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Speed: {acc.speed} km/h • Severity: <span className="font-semibold text-red-600">{acc.severity || "CRITICAL"}</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
