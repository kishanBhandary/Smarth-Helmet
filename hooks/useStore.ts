import { create } from "zustand";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

export interface HelmetState {
  id: string | null;
  name: string;
  serialNumber: string;
  status: "ACTIVE" | "INACTIVE" | "CHARGING" | "MAINTENANCE";
  batteryLevel: number;
  firmwareVersion: string;
}

export interface SensorState {
  id: string;
  type: string;
  name: string;
  status: "OK" | "ERROR" | "OFFLINE";
}

export interface BluetoothDeviceState {
  name: string;
  macAddress: string;
  connected: boolean;
  type: "PHONE" | "HELMET" | "HEADSET" | "SENSOR" | "OTHER";
}

export interface RideState {
  id: string | null;
  title: string;
  status: "ONGOING" | "COMPLETED" | "CANCELLED";
  startTime: string;
  distance: number; // km
  duration: number; // seconds
  avgSpeed: number;
  maxSpeed: number;
  locations: Array<{ latitude: number; longitude: number; speed?: number; timestamp: string }>;
}

export interface VehicleDetectionState {
  id: string;
  distance: number;
  direction: "REAR" | "LEFT" | "RIGHT";
  relativeSpeed?: number;
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
  timestamp: string;
}

export interface NotificationState {
  id: string;
  title: string;
  message: string;
  type: "CRASH" | "BATTERY" | "SYSTEM" | "BLUETOOTH" | "ALERT";
  read: boolean;
  createdAt: string;
}

export interface SettingsState {
  fallDetection: boolean;
  blindSpotAlerts: boolean;
  autoEmergencyCall: boolean;
  emergencyDelay: number;
  ledMode: "SOLID" | "FLASHING" | "PULSE" | "OFF";
  audioVolume: number;
}

export interface EmergencyContactState {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  email?: string;
  isPrimary: boolean;
}

interface SmartStore {
  user: UserProfile | null;
  helmet: HelmetState | null;
  sensors: SensorState[];
  bluetoothDevices: BluetoothDeviceState[];
  isBluetoothConnected: boolean;
  isBluetoothScanning: boolean;
  ongoingRide: RideState | null;
  vehicleDetections: VehicleDetectionState[];
  notifications: NotificationState[];
  settings: SettingsState;
  emergencyContacts: EmergencyContactState[];
  crashSOSCountdown: number | null; // null if no crash, seconds left if crash detected
  crashSOSActive: boolean;
  simulationActive: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setHelmet: (helmet: HelmetState | null) => void;
  setSensors: (sensors: SensorState[]) => void;
  updateSensor: (type: string, status: "OK" | "ERROR" | "OFFLINE") => void;
  setBluetoothDevices: (devices: BluetoothDeviceState[]) => void;
  setBluetoothConnected: (connected: boolean) => void;
  setBluetoothScanning: (scanning: boolean) => void;
  setOngoingRide: (ride: RideState | null) => void;
  addRideLocation: (lat: number, lng: number, speed?: number) => void;
  addVehicleDetection: (detection: Omit<VehicleDetectionState, "id" | "timestamp">) => void;
  setNotifications: (notifications: NotificationState[]) => void;
  addNotification: (notification: Omit<NotificationState, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  setSettings: (settings: SettingsState) => void;
  setEmergencyContacts: (contacts: EmergencyContactState[]) => void;
  triggerCrashAlert: () => void;
  cancelCrashSOS: () => void;
  setSOSCountdown: (seconds: number | null) => void;
  toggleSimulation: (active: boolean) => void;
  resetStore: () => void;
}

export const useStore = create<SmartStore>((set, get) => ({
  user: null,
  helmet: null,
  sensors: [],
  bluetoothDevices: [],
  isBluetoothConnected: false,
  isBluetoothScanning: false,
  ongoingRide: null,
  vehicleDetections: [],
  notifications: [],
  settings: {
    fallDetection: true,
    blindSpotAlerts: true,
    autoEmergencyCall: false,
    emergencyDelay: 30,
    ledMode: "SOLID",
    audioVolume: 80,
  },
  emergencyContacts: [],
  crashSOSCountdown: null,
  crashSOSActive: false,
  simulationActive: false,

  setUser: (user) => set({ user }),
  setHelmet: (helmet) => set({ helmet }),
  setSensors: (sensors) => set({ sensors }),
  updateSensor: (type, status) =>
    set((state) => ({
      sensors: state.sensors.map((s) => (s.type === type ? { ...s, status } : s)),
    })),
  setBluetoothDevices: (bluetoothDevices) => set({ bluetoothDevices }),
  setBluetoothConnected: (isBluetoothConnected) => set({ isBluetoothConnected }),
  setBluetoothScanning: (isBluetoothScanning) => set({ isBluetoothScanning }),
  setOngoingRide: (ongoingRide) => set({ ongoingRide }),
  addRideLocation: (latitude, longitude, speed = 0) =>
    set((state) => {
      if (!state.ongoingRide) return {};
      const newLocation = { latitude, longitude, speed, timestamp: new Date().toISOString() };
      const locations = [...state.ongoingRide.locations, newLocation];
      
      // Calculate updated speeds and distance
      // Simple speed logic for display:
      const maxSpeed = Math.max(state.ongoingRide.maxSpeed, speed);
      const avgSpeed = parseFloat(
        ((state.ongoingRide.avgSpeed * (locations.length - 1) + speed) / locations.length).toFixed(1)
      );
      
      // Approx distance increment (simulated distance)
      const distance = parseFloat((state.ongoingRide.distance + 0.05).toFixed(2));
      
      return {
        ongoingRide: {
          ...state.ongoingRide,
          locations,
          maxSpeed,
          avgSpeed,
          distance,
        },
      };
    }),
  addVehicleDetection: (det) =>
    set((state) => {
      const detection: VehicleDetectionState = {
        ...det,
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
      };
      
      // Add notification for critical threat
      let extraNotifications = [...state.notifications];
      if (det.threatLevel === "HIGH" && state.settings.blindSpotAlerts) {
        const notif: NotificationState = {
          id: Math.random().toString(),
          title: `COLLISION WARNING: Rear Threat`,
          message: `A vehicle is approaching rapidly from the ${det.direction} at ${det.relativeSpeed || 40} km/h!`,
          type: "ALERT",
          read: false,
          createdAt: new Date().toISOString(),
        };
        extraNotifications = [notif, ...extraNotifications];
      }

      return {
        vehicleDetections: [detection, ...state.vehicleDetections].slice(0, 20),
        notifications: extraNotifications,
      };
    }),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notif) =>
    set((state) => ({
      notifications: [
        {
          ...notif,
          id: Math.random().toString(),
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  setSettings: (settings) => set({ settings }),
  setEmergencyContacts: (emergencyContacts) => set({ emergencyContacts }),
  
  triggerCrashAlert: () => {
    const state = get();
    if (!state.settings.fallDetection || state.crashSOSActive) return;
    
    set({
      crashSOSActive: true,
      crashSOSCountdown: state.settings.emergencyDelay,
    });
  },

  cancelCrashSOS: () => {
    set({
      crashSOSActive: false,
      crashSOSCountdown: null,
    });
  },

  setSOSCountdown: (seconds) => set({ crashSOSCountdown: seconds }),
  toggleSimulation: (simulationActive) => set({ simulationActive }),
  resetStore: () =>
    set({
      user: null,
      helmet: null,
      sensors: [],
      bluetoothDevices: [],
      isBluetoothConnected: false,
      isBluetoothScanning: false,
      ongoingRide: null,
      vehicleDetections: [],
      notifications: [],
      crashSOSCountdown: null,
      crashSOSActive: false,
      simulationActive: false,
    }),
}));
