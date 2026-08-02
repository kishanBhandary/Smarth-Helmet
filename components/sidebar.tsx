"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useStore } from "@/hooks/useStore";
import {
  HardHat,
  LayoutDashboard,
  History,
  PhoneCall,
  Settings as SettingsIcon,
  LogOut,
  Radio,
  Battery,
  AlertCircle,
  Menu,
  X
} from "lucide-react";

let activeBluetoothDevice: any = null;
let activeGattServer: any = null;

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    helmet,
    setHelmet,
    isBluetoothConnected,
    setBluetoothConnected,
    addNotification,
    setBluetoothScanning,
    isBluetoothScanning,
    sensors,
    updateSensor,
    ongoingRide,
    addRideLocation,
    addVehicleDetection,
    triggerCrashAlert,
  } = useStore();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Ride History", path: "/rides", icon: History },
    { name: "Emergency Contacts", path: "/emergency", icon: PhoneCall },
    { name: "System Settings", path: "/settings", icon: SettingsIcon },
  ];

  // Web Bluetooth GATT Connection Handler
  const handleConnectBLE = async () => {
    if (isBluetoothConnected) {
      try {
        if (activeBluetoothDevice && activeBluetoothDevice.gatt.connected) {
          activeBluetoothDevice.gatt.disconnect();
        }
      } catch (err) {
        console.error("Disconnect error:", err);
      }
      activeBluetoothDevice = null;
      activeGattServer = null;
      setBluetoothConnected(false);
      addNotification({
        title: "Bluetooth Disconnected",
        message: "Aegis Smart Helmet has been disconnected.",
        type: "BLUETOOTH",
      });
    } else {
      setBluetoothScanning(true);
      try {
        if (typeof navigator === "undefined" || !(navigator as any).bluetooth) {
          throw new Error("Web Bluetooth is not supported by your browser or requires a secure connection (HTTPS or localhost).");
        }

        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ namePrefix: "Aegis" }],
          optionalServices: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"]
        });

        const server = await device.gatt.connect();
        activeBluetoothDevice = device;
        activeGattServer = server;

        const service = await server.getPrimaryService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
        const characteristic = await service.getCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8");

        await characteristic.startNotifications();

        characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
          const value = event.target.value;
          const decoder = new TextDecoder("utf-8");
          const jsonString = decoder.decode(value);
          
          try {
            const telemetry = JSON.parse(jsonString);
            
            // 1. Update battery status
            if (telemetry.bat !== undefined && helmet) {
              setHelmet({
                ...helmet,
                batteryLevel: telemetry.bat,
                status: telemetry.chg ? "CHARGING" : "ACTIVE",
              });
            }

            // 2. Update sensors
            const statusMap = ["ERROR", "OK", "OFFLINE"];
            if (telemetry.acc !== undefined) updateSensor("ACCELEROMETER", statusMap[telemetry.acc] as any);
            if (telemetry.gyr !== undefined) updateSensor("GYROSCOPE", statusMap[telemetry.gyr] as any);
            if (telemetry.gps !== undefined) updateSensor("GPS", statusMap[telemetry.gps] as any);
            if (telemetry.imu !== undefined) updateSensor("IMU", statusMap[telemetry.imu] as any);
            if (telemetry.bsp !== undefined) updateSensor("BLIND_SPOT", statusMap[telemetry.bsp] as any);
            if (telemetry.hrt !== undefined) updateSensor("HEART_RATE", statusMap[telemetry.hrt] as any);

            // 3. Update ride telemetry & locations
            if (ongoingRide?.id && telemetry.lat && telemetry.lng) {
              addRideLocation(telemetry.lat, telemetry.lng, telemetry.spd || 0);

              // Push location to database in the background
              fetch(`/api/rides/${ongoingRide.id}/locations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  latitude: telemetry.lat,
                  longitude: telemetry.lng,
                  speed: telemetry.spd || 0,
                  altitude: 10,
                }),
              }).catch((err) => console.error("BLE telemetry sync failed", err));
            }

            // 4. Vehicle threat detection
            if (telemetry.rad !== undefined && telemetry.rad !== -1) {
              addVehicleDetection({
                distance: telemetry.rad,
                direction: telemetry.col || "REAR",
                relativeSpeed: telemetry.spd_rel || 50,
                threatLevel: telemetry.tht || "LOW",
              });

              if (ongoingRide?.id) {
                fetch(`/api/rides/${ongoingRide.id}/detections`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    distance: telemetry.rad,
                    direction: telemetry.col || "REAR",
                    relativeSpeed: telemetry.spd_rel || 50,
                    threatLevel: telemetry.tht || "LOW",
                  }),
                }).catch((err) => console.error("BLE detection sync failed", err));
              }
            }

            // 5. Crash fall detection
            if (telemetry.crs === 1) {
              triggerCrashAlert();

              if (helmet?.id) {
                fetch(`/api/crashes`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    latitude: telemetry.lat || 37.7749,
                    longitude: telemetry.lng || -122.4194,
                    severity: "HIGH",
                    helmetId: helmet.id,
                    rideId: ongoingRide?.id || undefined,
                  }),
                }).catch((err) => console.error("BLE crash sync failed", err));
              }
            }

          } catch (err) {
            console.error("Failed to parse BLE telemetry:", err);
          }
        });

        device.addEventListener("gattserverdisconnected", () => {
          setBluetoothConnected(false);
          setBluetoothScanning(false);
          activeBluetoothDevice = null;
          activeGattServer = null;
          addNotification({
            title: "BLE Link Offline",
            message: "Aegis Helmet GATT server disconnected.",
            type: "BLUETOOTH",
          });
        });

        setBluetoothConnected(true);
        setBluetoothScanning(false);
        addNotification({
          title: "Bluetooth Connected",
          message: `BLE connection established with ${device.name || "Aegis Helmet"}.`,
          type: "BLUETOOTH",
        });

      } catch (err: any) {
        console.error("BLE connection failed:", err);
        setBluetoothScanning(false);
        addNotification({
          title: "Bluetooth Connection Failed",
          message: err.message || "Failed to establish BLE connection.",
          type: "ALERT",
        });
      }
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900/60 border-r border-white/5 p-6 backdrop-blur-xl">
      {/* Brand logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-500/10">
          <HardHat className="w-5.5 h-5.5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold tracking-wider text-white text-md">SMART HELMET</span>
          <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase">HUD Dashboard</span>
        </div>
      </div>

      {/* Helmet BLE widget */}
      <div className="glass p-4 rounded-xl border border-white/5 mb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Helmet Device</span>
          <span className={`inline-block w-2 h-2 rounded-full ${isBluetoothConnected ? "bg-emerald-400 glow-emerald" : "bg-slate-500"}`}></span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
            <Radio className={`w-5 h-5 ${isBluetoothScanning ? "animate-pulse" : ""}`} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-white truncate">
              {helmet?.name || "Aegis Elite V1"}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {helmet?.serialNumber || "SN-AEGIS-88A9"}
            </span>
          </div>
        </div>

        {/* Battery widget */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Battery className={`w-4 h-4 ${isBluetoothConnected && (helmet?.batteryLevel || 80) < 25 ? "text-rose-500 animate-pulse" : "text-cyan-400"}`} />
            <span>Battery: {isBluetoothConnected ? `${helmet?.batteryLevel || 84}%` : "Offline"}</span>
          </div>
          <span className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            {isBluetoothConnected ? (helmet?.status || "ACTIVE") : "OFFLINE"}
          </span>
        </div>

        {/* Connect button */}
        <button
          onClick={handleConnectBLE}
          disabled={isBluetoothScanning}
          className={`w-full text-xs font-bold py-2 rounded-lg transition-all active:scale-[0.98] mt-1 flex items-center justify-center gap-1.5 ${
            isBluetoothConnected
              ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
              : "bg-cyan-500 text-slate-950 hover:shadow-md hover:shadow-cyan-500/10 font-bold"
          }`}
        >
          {isBluetoothScanning ? (
            "Scanning via BLE..."
          ) : isBluetoothConnected ? (
            "Disconnect BLE"
          ) : (
            <>
              <Radio className="w-3.5 h-3.5" />
              Connect Helmet BLE
            </>
          )}
        </button>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User profile / Log out */}
      <div className="border-t border-white/5 pt-4 mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-cyan-400 font-bold text-sm">
            {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">
              {session?.user?.name || "Aegis Rider"}
            </span>
            <span className="text-[10px] text-slate-500 truncate uppercase font-semibold tracking-wider">
              {session?.user?.role || "Rider"}
            </span>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 font-semibold py-2 rounded-lg text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out Session
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu trigger */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-950 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <HardHat className="w-6 h-6 text-cyan-400" />
          <span className="font-bold tracking-wider text-white text-sm">SMART HELMET</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col w-64 h-full animate-slide-in">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
