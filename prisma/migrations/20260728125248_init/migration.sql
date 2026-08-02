-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "HelmetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CHARGING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('PHONE', 'HELMET', 'HEADSET', 'SENSOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SensorType" AS ENUM ('ACCELEROMETER', 'GYROSCOPE', 'GPS', 'IMU', 'BLIND_SPOT', 'HEART_RATE');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('OK', 'ERROR', 'OFFLINE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CRASH', 'BATTERY', 'SYSTEM', 'BLUETOOTH', 'ALERT');

-- CreateEnum
CREATE TYPE "CrashSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DetectionDirection" AS ENUM ('REAR', 'LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "ThreatLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "LedMode" AS ENUM ('SOLID', 'FLASHING', 'PULSE', 'OFF');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Helmet" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "HelmetStatus" NOT NULL DEFAULT 'INACTIVE',
    "batteryLevel" INTEGER NOT NULL DEFAULT 100,
    "firmwareVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "Helmet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BluetoothDevice" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL DEFAULT 'HELMET',
    "paired" BOOLEAN NOT NULL DEFAULT false,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "helmetId" UUID,

    CONSTRAINT "BluetoothDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "distance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "avgSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "RideStatus" NOT NULL DEFAULT 'ONGOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "helmetId" UUID,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideLocation" (
    "id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rideId" UUID NOT NULL,

    CONSTRAINT "RideLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" UUID NOT NULL,
    "type" "SensorType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SensorStatus" NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "helmetId" UUID NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrashEvent" (
    "id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "severity" "CrashSeverity" NOT NULL DEFAULT 'HIGH',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rideId" UUID,
    "helmetId" UUID NOT NULL,

    CONSTRAINT "CrashEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDetection" (
    "id" UUID NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "direction" "DetectionDirection" NOT NULL DEFAULT 'REAR',
    "relativeSpeed" DOUBLE PRECISION,
    "threatLevel" "ThreatLevel" NOT NULL DEFAULT 'LOW',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rideId" UUID NOT NULL,

    CONSTRAINT "VehicleDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" UUID NOT NULL,
    "fallDetection" BOOLEAN NOT NULL DEFAULT true,
    "blindSpotAlerts" BOOLEAN NOT NULL DEFAULT true,
    "autoEmergencyCall" BOOLEAN NOT NULL DEFAULT false,
    "emergencyDelay" INTEGER NOT NULL DEFAULT 30,
    "ledMode" "LedMode" NOT NULL DEFAULT 'SOLID',
    "audioVolume" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BluetoothLog" (
    "id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "status" "LogStatus" NOT NULL DEFAULT 'CONNECTED',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,
    "helmetId" UUID,
    "deviceId" UUID,

    CONSTRAINT "BluetoothLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryLog" (
    "id" UUID NOT NULL,
    "batteryLevel" INTEGER NOT NULL,
    "voltage" DOUBLE PRECISION,
    "charging" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "helmetId" UUID NOT NULL,

    CONSTRAINT "BatteryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Helmet_serialNumber_key" ON "Helmet"("serialNumber");

-- CreateIndex
CREATE INDEX "Helmet_userId_idx" ON "Helmet"("userId");

-- CreateIndex
CREATE INDEX "Helmet_serialNumber_idx" ON "Helmet"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BluetoothDevice_macAddress_key" ON "BluetoothDevice"("macAddress");

-- CreateIndex
CREATE INDEX "BluetoothDevice_helmetId_idx" ON "BluetoothDevice"("helmetId");

-- CreateIndex
CREATE INDEX "BluetoothDevice_macAddress_idx" ON "BluetoothDevice"("macAddress");

-- CreateIndex
CREATE INDEX "Ride_userId_idx" ON "Ride"("userId");

-- CreateIndex
CREATE INDEX "Ride_helmetId_idx" ON "Ride"("helmetId");

-- CreateIndex
CREATE INDEX "Ride_startTime_idx" ON "Ride"("startTime");

-- CreateIndex
CREATE INDEX "RideLocation_rideId_idx" ON "RideLocation"("rideId");

-- CreateIndex
CREATE INDEX "RideLocation_timestamp_idx" ON "RideLocation"("timestamp");

-- CreateIndex
CREATE INDEX "Sensor_helmetId_idx" ON "Sensor"("helmetId");

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "CrashEvent_rideId_idx" ON "CrashEvent"("rideId");

-- CreateIndex
CREATE INDEX "CrashEvent_helmetId_idx" ON "CrashEvent"("helmetId");

-- CreateIndex
CREATE INDEX "CrashEvent_timestamp_idx" ON "CrashEvent"("timestamp");

-- CreateIndex
CREATE INDEX "VehicleDetection_rideId_idx" ON "VehicleDetection"("rideId");

-- CreateIndex
CREATE INDEX "VehicleDetection_timestamp_idx" ON "VehicleDetection"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE INDEX "Settings_userId_idx" ON "Settings"("userId");

-- CreateIndex
CREATE INDEX "BluetoothLog_helmetId_idx" ON "BluetoothLog"("helmetId");

-- CreateIndex
CREATE INDEX "BluetoothLog_deviceId_idx" ON "BluetoothLog"("deviceId");

-- CreateIndex
CREATE INDEX "BluetoothLog_timestamp_idx" ON "BluetoothLog"("timestamp");

-- CreateIndex
CREATE INDEX "BatteryLog_helmetId_idx" ON "BatteryLog"("helmetId");

-- CreateIndex
CREATE INDEX "BatteryLog_timestamp_idx" ON "BatteryLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helmet" ADD CONSTRAINT "Helmet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BluetoothDevice" ADD CONSTRAINT "BluetoothDevice_helmetId_fkey" FOREIGN KEY ("helmetId") REFERENCES "Helmet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_helmetId_fkey" FOREIGN KEY ("helmetId") REFERENCES "Helmet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideLocation" ADD CONSTRAINT "RideLocation_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_helmetId_fkey" FOREIGN KEY ("helmetId") REFERENCES "Helmet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashEvent" ADD CONSTRAINT "CrashEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashEvent" ADD CONSTRAINT "CrashEvent_helmetId_fkey" FOREIGN KEY ("helmetId") REFERENCES "Helmet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDetection" ADD CONSTRAINT "VehicleDetection_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BluetoothLog" ADD CONSTRAINT "BluetoothLog_helmetId_fkey" FOREIGN KEY ("helmetId") REFERENCES "Helmet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BluetoothLog" ADD CONSTRAINT "BluetoothLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BluetoothDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryLog" ADD CONSTRAINT "BatteryLog_helmetId_fkey" FOREIGN KEY ("helmetId") REFERENCES "Helmet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
