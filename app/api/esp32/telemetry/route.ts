import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { HelmetService } from "@/services/helmet";
import { SensorService } from "@/services/sensor";
import { RideService } from "@/services/ride";
import { SensorType, SensorStatus, DetectionDirection, ThreatLevel, CrashSeverity } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serialNumber, batteryLevel, voltage, charging, gps, sensors, vehicleDetection, crash } = body;

    if (!serialNumber) {
      return NextResponse.json({ success: false, error: "serialNumber is required" }, { status: 400 });
    }

    // Find the helmet by serial number
    const helmet = await prisma.helmet.findUnique({
      where: { serialNumber },
      include: { sensors: true }
    });

    if (!helmet) {
      return NextResponse.json({ success: false, error: "Helmet not found" }, { status: 404 });
    }

    // 1. Update battery status if provided
    if (batteryLevel !== undefined) {
      await HelmetService.logBattery({
        helmetId: helmet.id,
        batteryLevel: Math.round(Number(batteryLevel)),
        voltage: voltage !== undefined ? Number(voltage) : undefined,
        charging: Boolean(charging),
      });
    }

    // 2. Update sensor statuses if provided
    if (sensors && typeof sensors === "object") {
      for (const [key, val] of Object.entries(sensors)) {
        const type = key.toUpperCase() as SensorType;
        const status = (val as string).toUpperCase() as SensorStatus;
        
        // Validate type and status enums
        if (Object.values(SensorType).includes(type) && Object.values(SensorStatus).includes(status)) {
          await SensorService.reportSensorStatus(helmet.id, type, status);
        }
      }
    }

    // 3. Handle Ride Telemetry (GPS, Detections, Crashes)
    if (helmet.userId) {
      // Find if there is an ongoing ride for this user
      let ongoingRide = await prisma.ride.findFirst({
        where: {
          userId: helmet.userId,
          status: "ONGOING"
        }
      });

      // If gps data is provided, but no ongoing ride, and speed is > 0, let's automatically start a ride
      if (gps && !ongoingRide && gps.speed && Number(gps.speed) > 2) {
        ongoingRide = await RideService.startRide(helmet.userId, {
          title: `ESP32 Smart Ride - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          helmetId: helmet.id,
        });
      }

      // If there is an ongoing ride, log the GPS location
      if (gps && ongoingRide) {
        await RideService.addRideLocation(ongoingRide.id, {
          latitude: Number(gps.latitude),
          longitude: Number(gps.longitude),
          speed: gps.speed !== undefined ? Number(gps.speed) : undefined,
          altitude: gps.altitude !== undefined ? Number(gps.altitude) : undefined,
        });
      }

      // Log vehicle detection if provided and there is an ongoing ride
      if (vehicleDetection && ongoingRide) {
        const direction = (vehicleDetection.direction || "REAR").toUpperCase() as DetectionDirection;
        const threatLevel = (vehicleDetection.threatLevel || "LOW").toUpperCase() as ThreatLevel;

        if (Object.values(DetectionDirection).includes(direction) && Object.values(ThreatLevel).includes(threatLevel)) {
          await RideService.createVehicleDetection({
            rideId: ongoingRide.id,
            distance: Number(vehicleDetection.distance),
            direction,
            relativeSpeed: vehicleDetection.relativeSpeed !== undefined ? Number(vehicleDetection.relativeSpeed) : undefined,
            threatLevel,
          });
        }
      }

      // Log crash event if detected
      if (crash) {
        const severity = (crash.severity || "HIGH").toUpperCase() as CrashSeverity;
        
        await RideService.createCrashEvent({
          latitude: Number(crash.latitude),
          longitude: Number(crash.longitude),
          severity: Object.values(CrashSeverity).includes(severity) ? severity : CrashSeverity.HIGH,
          helmetId: helmet.id,
          rideId: ongoingRide?.id || undefined,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Telemetry processed successfully",
      helmetId: helmet.id,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "An error occurred while processing telemetry",
    }, { status: 500 });
  }
}
