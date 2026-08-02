"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/dashboard-layout";
import { useStore } from "@/hooks/useStore";
import {
  Activity,
  AlertTriangle,
  Play,
  Square,
  Skull,
  Battery,
  Gauge,
  Compass,
  Bell,
  CheckCircle,
  Radio,
  Car,
  Wifi
} from "lucide-react";

// Dynamically import map with SSR disabled to avoid leaflet window object issues
const RiderMap = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 font-mono text-sm animate-pulse">
      Initialising Satellite GPS Links...
    </div>
  ),
});

export default function DashboardPage() {
  const {
    isBluetoothConnected,
    setBluetoothConnected,
    ongoingRide,
    setOngoingRide,
    addRideLocation,
    vehicleDetections,
    addVehicleDetection,
    notifications,
    setNotifications,
    addNotification,
    sensors,
    setSensors,
    updateSensor,
    helmet,
    setHelmet,
    triggerCrashAlert,
    simulationActive,
    toggleSimulation
  } = useStore();

  const [simSpeed, setSimSpeed] = useState(0);
  const [radarDistance, setRadarDistance] = useState<number | null>(null);

  // Polling loop to fetch real-time telemetry from backend
  useEffect(() => {
    let active = true;
    
    const syncTelemetry = async () => {
      try {
        // 1. Fetch helmet(s)
        const helmetRes = await fetch("/api/helmets");
        if (!helmetRes.ok || !active) return;
        const helmetData = await helmetRes.json();
        
        let activeHelmet = null;
        if (helmetData && helmetData.success) {
          if (helmetData.data.length > 0) {
            activeHelmet = helmetData.data[0];
          } else {
            // Automatically seed a default helmet if none exists
            const createRes = await fetch("/api/helmets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Aegis Elite V1",
                serialNumber: `SN-AEGIS-${Math.floor(100000 + Math.random() * 900000)}`,
              }),
            });
            if (createRes.ok) {
              const createData = await createRes.json();
              if (createData.success) {
                activeHelmet = createData.data;
              }
            }
          }
        }

        if (activeHelmet && active) {
          // Set helmet in store (re-fetch if we just created it and don't have sensors nested)
          if (!activeHelmet.sensors) {
            const reFetchRes = await fetch("/api/helmets");
            const reFetchData = await reFetchRes.json();
            if (reFetchData.success && reFetchData.data.length > 0) {
              activeHelmet = reFetchData.data[0];
            }
          }

          setHelmet({
            id: activeHelmet.id,
            name: activeHelmet.name,
            serialNumber: activeHelmet.serialNumber,
            status: activeHelmet.status,
            batteryLevel: activeHelmet.batteryLevel,
            firmwareVersion: activeHelmet.firmwareVersion,
          });

          if (activeHelmet.sensors) {
            setSensors(activeHelmet.sensors.map((s: any) => ({
              id: s.id,
              type: s.type,
              name: s.name,
              status: s.status,
            })));
          }

          // Mark bluetooth as connected if helmet synced recently (last 45 seconds)
          const lastSyncTime = new Date(activeHelmet.lastSync).getTime();
          if (Date.now() - lastSyncTime < 45000) {
            setBluetoothConnected(true);
          }
        }

        // 2. Fetch all rides to check for ongoing ride
        const ridesRes = await fetch("/api/rides");
        if (!ridesRes.ok || !active) return;
        const ridesData = await ridesRes.json();
        
        if (ridesData.success && active) {
          const ongoing = ridesData.data.find((r: any) => r.status === "ONGOING");
          if (ongoing) {
            // Fetch detailed ongoing ride to get locations and vehicle detections
            const rideDetailRes = await fetch(`/api/rides/${ongoing.id}`);
            if (rideDetailRes.ok) {
              const rideDetailData = await rideDetailRes.json();
              if (rideDetailData.success && active) {
                const ride = rideDetailData.data;
                
                setOngoingRide({
                  id: ride.id,
                  title: ride.title,
                  status: "ONGOING",
                  startTime: ride.startTime,
                  distance: ride.distance,
                  duration: ride.duration,
                  avgSpeed: ride.avgSpeed,
                  maxSpeed: ride.maxSpeed,
                  locations: ride.locations || [],
                });

                // Update speed based on last location (if simulation is NOT active)
                if (!simulationActive && ride.locations && ride.locations.length > 0) {
                  const lastLoc = ride.locations[ride.locations.length - 1];
                  setSimSpeed(lastLoc.speed || 0);
                }

                // Handle vehicle detections
                if (ride.vehicleDetections && ride.vehicleDetections.length > 0) {
                  const latestDet = ride.vehicleDetections[0];
                  const detTime = new Date(latestDet.timestamp).getTime();
                  if (Date.now() - detTime < 10000) {
                    setRadarDistance(latestDet.distance);
                  } else {
                    setRadarDistance(null);
                  }
                } else {
                  setRadarDistance(null);
                }
              }
            }
          } else {
            // No ongoing ride in db
            if (!simulationActive) {
              setOngoingRide(null);
              setSimSpeed(0);
              setRadarDistance(null);
            }
          }
        }

        // 3. Fetch notifications
        const notifRes = await fetch("/api/notifications");
        if (notifRes.ok && active) {
          const notifData = await notifRes.json();
          if (notifData.success) {
            setNotifications(notifData.data);
          }
        }

      } catch (err) {
        console.error("Telemetry sync failed", err);
      }
    };

    // Run sync immediately on mount
    syncTelemetry();

    // Poll every 3 seconds
    const interval = setInterval(syncTelemetry, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    setHelmet,
    setSensors,
    setBluetoothConnected,
    setOngoingRide,
    setNotifications,
    simulationActive
  ]);

  // Simulation loop for ongoing rides
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (ongoingRide?.status === "ONGOING" && simulationActive) {
      // Simulate GPS coordinates path around San Francisco
      let baseLat = 37.7749;
      let baseLng = -122.4194;
      let count = ongoingRide.locations.length;

      interval = setInterval(() => {
        // Increment coordinate slightly to simulate movement
        const nextLat = baseLat + Math.sin(count * 0.15) * 0.005;
        const nextLng = baseLng + Math.cos(count * 0.15) * 0.005;
        
        // Simulate fluctuating speed
        const currentSpeed = Math.floor(35 + Math.random() * 25);
        setSimSpeed(currentSpeed);
        
        // Add location to store
        addRideLocation(nextLat, nextLng, currentSpeed);
        
        // Increment count
        count++;

        // Send location telemetry to backend API in background
        if (ongoingRide.id) {
          fetch(`/api/rides/${ongoingRide.id}/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: nextLat,
              longitude: nextLng,
              speed: currentSpeed,
              altitude: 42 + Math.random() * 5,
            }),
          }).catch((err) => console.error("Telemetry failed", err));
        }

        // Randomly simulate approaching vehicle (15% chance per tick)
        if (Math.random() < 0.15) {
          triggerSimulatedVehicleApproach();
        }
      }, 4000);
    }

    return () => clearInterval(interval);
  }, [ongoingRide, simulationActive, addRideLocation]);

  // Start Ride handler
  const handleStartRide = async () => {
    try {
      const response = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Evening Ride - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          helmetId: helmet?.id || undefined,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const ride = resData.data;
        setOngoingRide({
          id: ride.id,
          title: ride.title,
          status: "ONGOING",
          startTime: ride.startTime,
          distance: 0,
          duration: 0,
          avgSpeed: 0,
          maxSpeed: 0,
          locations: [],
        });

        // Initialize coordinates immediately
        addRideLocation(37.7749, -122.4194, 0);

        // Turn simulation on
        toggleSimulation(true);

        addNotification({
          title: "Ride Started",
          message: "HUD navigation and GPS tracking initiated.",
          type: "SYSTEM",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // End Ride handler
  const handleEndRide = async () => {
    if (!ongoingRide?.id) return;
    try {
      // Calculate active duration
      const durationSeconds = Math.floor(
        (Date.now() - new Date(ongoingRide.startTime).getTime()) / 1000
      );

      const response = await fetch(`/api/rides/${ongoingRide.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: ongoingRide.distance,
          duration: durationSeconds || 60,
          avgSpeed: ongoingRide.avgSpeed || 42.0,
          maxSpeed: ongoingRide.maxSpeed || 62.0,
          status: "COMPLETED",
        }),
      });

      if (response.ok) {
        setOngoingRide(null);
        setSimSpeed(0);
        toggleSimulation(false);
        setRadarDistance(null);

        addNotification({
          title: "Ride Completed",
          message: `Ride summary uploaded: ${ongoingRide.distance}km in ${Math.round((durationSeconds || 60)/60)}m.`,
          type: "SYSTEM",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate vehicle approaching from rear radar
  const triggerSimulatedVehicleApproach = () => {
    if (!isBluetoothConnected) return;

    // Phase approach simulation: vehicle gets closer
    setRadarDistance(120);
    setTimeout(() => setRadarDistance(80), 1000);
    setTimeout(() => setRadarDistance(40), 2000);
    setTimeout(() => {
      setRadarDistance(12);
      // Log critical warning
      addVehicleDetection({
        distance: 12,
        direction: "REAR",
        relativeSpeed: 75,
        threatLevel: "HIGH",
      });

      // Send threat telemetry to database
      if (ongoingRide?.id) {
        fetch(`/api/rides/${ongoingRide.id}/detections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            distance: 12.0,
            direction: "REAR",
            relativeSpeed: 75.0,
            threatLevel: "HIGH",
          }),
        }).catch((err) => console.error("Detection logging failed", err));
      }
    }, 3000);
    setTimeout(() => setRadarDistance(null), 7000); // clears radar
  };

  // Simulate draining helmet battery
  const handleDrainBattery = () => {
    if (!helmet) return;
    const newLevel = Math.max(helmet.batteryLevel - 10, 5);
    
    // Update store
    setHelmet({ ...helmet, batteryLevel: newLevel });

    if (newLevel <= 20) {
      addNotification({
        title: "Battery Level Critical",
        message: `Helmet battery at ${newLevel}%. Connect charger immediately.`,
        type: "BATTERY",
      });
    }

    // Call background API to update
    if (helmet.id) {
      fetch(`/api/helmets/${helmet.id}/battery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batteryLevel: newLevel,
          voltage: 3.4,
          charging: false,
        }),
      }).catch((err) => console.error("Battery update failed", err));
    }
  };

  // Simulate sensor failure
  const handleToggleSensorFailure = () => {
    const gpsSensor = sensors.find((s) => s.type === "GPS");
    const nextStatus = gpsSensor?.status === "OK" ? "ERROR" : "OK";
    updateSensor("GPS", nextStatus);

    addNotification({
      title: nextStatus === "ERROR" ? "SENSOR FAILURE: GPS Link" : "SENSOR SECURED: GPS Link",
      message: nextStatus === "ERROR" ? "Satellite telemetry connection lost." : "GPS connection re-established.",
      type: "ALERT",
    });

    if (helmet?.id) {
      // Find GPS sensor db id
      fetch(`/api/sensors?helmetId=${helmet.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const gps = data.data.find((s: any) => s.type === "GPS");
            if (gps) {
              fetch(`/api/sensors/${gps.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
              });
            }
          }
        });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Rider Command Center</h1>
            <p className="text-sm text-slate-400 mt-1">
              Active telemetry console for Aegis HUD helmet systems.
            </p>
          </div>

          {/* SIMULATION PANEL */}
          <div className="glass px-4 py-3 rounded-xl border border-cyan-500/20 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 mr-2">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              Sim Controls:
            </span>
            
            {ongoingRide?.status === "ONGOING" ? (
              <button
                onClick={handleEndRide}
                className="bg-rose-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-rose-600 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Ride
              </button>
            ) : (
              <button
                disabled={!isBluetoothConnected}
                onClick={handleStartRide}
                className="bg-cyan-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-cyan-600 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Ride
              </button>
            )}

            <button
              disabled={!isBluetoothConnected}
              onClick={triggerSimulatedVehicleApproach}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
            >
              Sim Radar Hazard
            </button>

            <button
              disabled={!isBluetoothConnected}
              onClick={handleDrainBattery}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
            >
              Drain Battery
            </button>

            <button
              disabled={!isBluetoothConnected}
              onClick={handleToggleSensorFailure}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
            >
              GPS Fail Toggle
            </button>

            <button
              disabled={!isBluetoothConnected}
              onClick={triggerCrashAlert}
              className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-bold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Skull className="w-3.5 h-3.5" />
              Sim Fall (SOS)
            </button>
          </div>
        </div>

        {!isBluetoothConnected && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-4 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>
              <strong>Helmet BLE Link Offline:</strong> Please click <strong>"Connect Helmet BLE"</strong> in the sidebar to sync dashboard telemetry, enable simulation widgets, and start rides.
            </p>
          </div>
        )}

        {/* TOP ROW HUD TELEMETRY METRICS */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Speedometer */}
          <div className="glass rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-3 left-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Velocity HUD</div>
            
            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              {/* Speed circular track */}
              <svg className="w-full h-full -rotate-90">
                <circle cx="72" cy="72" r="64" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  fill="transparent"
                  stroke="url(#speed-gradient)"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 64}`}
                  strokeDashoffset={`${2 * Math.PI * 64 * (1 - (isBluetoothConnected ? Math.min(simSpeed, 120) : 0) / 120)}`}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="speed-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black text-white font-mono tracking-tight">
                  {isBluetoothConnected ? simSpeed : 0}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">KM/H</span>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-slate-400 mt-2 font-semibold">
              <span>Avg: {ongoingRide ? ongoingRide.avgSpeed : 0} km/h</span>
              <span className="text-slate-600">|</span>
              <span>Max: {ongoingRide ? ongoingRide.maxSpeed : 0} km/h</span>
            </div>
          </div>

          {/* Card 2: Rear Collision Radar */}
          <div className="glass rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-3 left-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Blind Spot Radar</div>
            
            <div className="flex-1 flex flex-col items-center justify-center my-4 w-full">
              {/* Radar layout */}
              <div className="w-full max-w-[200px] h-32 relative bg-slate-950/40 rounded-xl border border-white/5 overflow-hidden flex flex-col items-center justify-between py-2">
                {/* Radar beam scan lines */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.03)_0%,transparent_70%)]" />
                
                {/* Grid arches */}
                <div className="absolute bottom-0 w-full h-[80%] border-t border-white/5 rounded-t-full" />
                <div className="absolute bottom-0 w-[70%] h-[55%] border-t border-white/5 rounded-t-full" />
                <div className="absolute bottom-0 w-[40%] h-[30%] border-t border-white/5 rounded-t-full" />
                
                {/* Radar scan sweeper */}
                <div className="absolute bottom-0 w-full h-full origin-bottom animate-scan bg-gradient-to-t from-transparent to-cyan-500/5 pointer-events-none" />

                {/* Simulated Vehicle approaching */}
                {isBluetoothConnected && radarDistance !== null ? (
                  <div
                    className="absolute flex flex-col items-center gap-1 transition-all duration-700 z-10"
                    style={{
                      bottom: `${Math.max(10, 100 - (radarDistance / 150) * 100)}%`,
                    }}
                  >
                    <Car
                      className={`w-6 h-6 ${
                        radarDistance < 20
                          ? "text-rose-500 animate-bounce"
                          : radarDistance < 60
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-bold px-1 py-0.5 rounded font-mono ${
                        radarDistance < 20
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-slate-900/60 text-slate-400"
                      }`}
                    >
                      {radarDistance}m
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 font-medium absolute top-1/2 -translate-y-1/2">
                    {isBluetoothConnected ? "No Threats Detected" : "Radar Link Offline"}
                  </div>
                )}

                {/* User bike icon at the center bottom */}
                <div className="z-10 mt-auto bg-cyan-500/10 border border-cyan-500/30 p-1.5 rounded-full text-cyan-400">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="text-center text-xs font-semibold text-slate-400">
              {isBluetoothConnected && radarDistance !== null && radarDistance < 20 ? (
                <span className="text-rose-500 animate-pulse uppercase tracking-wider font-extrabold flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Hazard: Vehicle Close!
                </span>
              ) : (
                <span>180&deg; Rear Radar Coverage</span>
              )}
            </div>
          </div>

          {/* Card 3: Ride Details */}
          <div className="glass rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-3 left-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ride Statistics</div>
            
            <div className="flex-1 flex flex-col justify-center gap-3 my-6 font-mono text-sm">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Status</span>
                <span className={`font-semibold ${ongoingRide ? "text-cyan-400" : "text-slate-500"}`}>
                  {ongoingRide ? "ONGOING" : "STANDBY"}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Distance</span>
                <span className="font-semibold text-white">
                  {ongoingRide ? `${ongoingRide.distance} km` : "0.0 km"}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">GPS Path</span>
                <span className="font-semibold text-white">
                  {ongoingRide ? `${ongoingRide.locations.length} pings` : "0 points"}
                </span>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1 justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Auto Sync to Cloud active</span>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: MAP & SENSOR HEALTH GRID */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Column Left: Map (Covers 2 cols on wide) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-white">Live Route Tracker</h2>
              <span className="text-xs text-slate-400 font-semibold font-mono">GPS Coordinates Layer</span>
            </div>
            
            <div className="w-full aspect-video md:h-[380px] rounded-xl overflow-hidden shadow-lg border border-white/10">
              <RiderMap locations={ongoingRide?.locations || []} ongoing={!!ongoingRide} />
            </div>
          </div>

          {/* Column Right: Sensor checklist */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white">System Diagnostics</h2>
            
            <div className="glass rounded-xl p-5 border border-white/5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest pb-1 border-b border-white/5">
                  Telemetry Nodes
                </div>
                
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">{sensor.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        sensor.status === "OK"
                          ? "bg-emerald-400 glow-emerald"
                          : sensor.status === "ERROR"
                          ? "bg-rose-500 glow-rose animate-pulse"
                          : "bg-slate-500"
                      }`} />
                      <span className={`text-xs font-mono font-bold ${
                        sensor.status === "OK"
                          ? "text-emerald-400"
                          : sensor.status === "ERROR"
                          ? "text-rose-400"
                          : "text-slate-500"
                      }`}>
                        {sensor.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-xs text-slate-500 flex items-start gap-2">
                <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  HUD modules are syncing at 25Hz over low-latency Bluetooth. If a telemetry node fails, diagnostic codes are broadcast.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: VEHICLE DETECTIONS LOG & NOTIFICATIONS FEED */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card Left: Radar Hazard Warnings Log */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-cyan-400" />
              Radar Proximity Alarms
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {vehicleDetections.length > 0 ? (
                vehicleDetections.map((det) => (
                  <div
                    key={det.id}
                    className={`p-3 rounded-lg border flex items-center justify-between text-sm ${
                      det.threatLevel === "HIGH"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        : det.threatLevel === "MEDIUM"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-slate-900/50 border-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${det.threatLevel === "HIGH" ? "bg-rose-500/20" : "bg-slate-800"}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">Vehicle Close</span>
                        <span className="text-xs text-slate-400">Direction: {det.direction}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col font-mono text-xs">
                      <span className="font-bold">{det.distance}m away</span>
                      <span className="text-slate-500">{new Date(det.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-8 text-sm">
                  No threat events logged.
                </div>
              )}
            </div>
          </div>

          {/* Card Right: Notifications / Feed */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              Notifications Feed
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-lg bg-slate-900/40 border border-white/5 flex items-start justify-between text-sm hover:bg-slate-900/70 transition-all"
                  >
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        notif.type === "CRASH"
                          ? "bg-rose-500"
                          : notif.type === "BATTERY"
                          ? "bg-amber-500"
                          : notif.type === "BLUETOOTH"
                          ? "bg-cyan-500"
                          : "bg-slate-400"
                      }`} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{notif.title}</span>
                        <span className="text-xs text-slate-400 mt-0.5">{notif.message}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-600 shrink-0 font-mono pl-2">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-8 text-sm">
                  No system notifications.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
