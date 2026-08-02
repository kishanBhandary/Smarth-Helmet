import { z } from "zod";

// User schemas
export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().or(z.literal("")),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

// Helmet schemas
export const createHelmetSchema = z.object({
  name: z.string().min(2, "Helmet name must be at least 2 characters"),
  serialNumber: z.string().min(5, "Serial number must be at least 5 characters"),
});

export const updateHelmetSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "CHARGING", "MAINTENANCE"]).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  firmwareVersion: z.string().optional(),
});

// Bluetooth device schemas
export const pairBluetoothDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Invalid MAC address format"),
  type: z.enum(["PHONE", "HELMET", "HEADSET", "SENSOR", "OTHER"]),
  helmetId: z.string().uuid().optional(),
});

export const updateBluetoothDeviceSchema = z.object({
  connected: z.boolean().optional(),
  paired: z.boolean().optional(),
});

export const createBluetoothLogSchema = z.object({
  event: z.string().min(1),
  status: z.enum(["CONNECTED", "DISCONNECTED", "FAILED"]),
  helmetId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  details: z.string().optional(),
});

// Battery log schema
export const createBatteryLogSchema = z.object({
  helmetId: z.string().uuid(),
  batteryLevel: z.number().min(0).max(100),
  voltage: z.number().positive().optional(),
  charging: z.boolean(),
});

// Sensor schemas
export const createSensorSchema = z.object({
  type: z.enum(["ACCELEROMETER", "GYROSCOPE", "GPS", "IMU", "BLIND_SPOT", "HEART_RATE"]),
  name: z.string().min(1),
  status: z.enum(["OK", "ERROR", "OFFLINE"]),
  helmetId: z.string().uuid(),
});

export const updateSensorSchema = z.object({
  status: z.enum(["OK", "ERROR", "OFFLINE"]),
});

// Ride schemas
export const startRideSchema = z.object({
  title: z.string().optional(),
  helmetId: z.string().uuid().optional(),
});

export const endRideSchema = z.object({
  distance: z.number().nonnegative(),
  duration: z.number().int().nonnegative(),
  avgSpeed: z.number().nonnegative(),
  maxSpeed: z.number().nonnegative(),
  status: z.enum(["COMPLETED", "CANCELLED"]),
});

export const addRideLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().nonnegative().optional(),
  altitude: z.number().optional(),
  timestamp: z.string().datetime().optional(),
});

export const addMultipleRideLocationsSchema = z.object({
  locations: z.array(addRideLocationSchema).min(1),
});

// Crash Event schemas
export const createCrashEventSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rideId: z.string().uuid().optional(),
  helmetId: z.string().uuid(),
  timestamp: z.string().datetime().optional(),
});

export const resolveCrashEventSchema = z.object({
  resolved: z.boolean(),
});

// Vehicle Detection schemas
export const createVehicleDetectionSchema = z.object({
  distance: z.number().nonnegative(),
  direction: z.enum(["REAR", "LEFT", "RIGHT"]),
  relativeSpeed: z.number().optional(),
  threatLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rideId: z.string().uuid(),
});

// Settings schemas
export const updateSettingsSchema = z.object({
  fallDetection: z.boolean().optional(),
  blindSpotAlerts: z.boolean().optional(),
  autoEmergencyCall: z.boolean().optional(),
  emergencyDelay: z.number().int().min(5).max(300).optional(),
  ledMode: z.enum(["SOLID", "FLASHING", "PULSE", "OFF"]).optional(),
  audioVolume: z.number().int().min(0).max(100).optional(),
});

// Emergency Contact schemas
export const emergencyContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number must be at least 7 characters"),
  relationship: z.string().min(1, "Relationship is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  isPrimary: z.boolean().optional(),
});

// Notification schemas
export const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["CRASH", "BATTERY", "SYSTEM", "BLUETOOTH", "ALERT"]),
  userId: z.string().uuid(),
});
