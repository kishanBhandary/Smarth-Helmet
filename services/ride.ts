import prisma from "@/lib/prisma";
import {
  Ride,
  RideLocation,
  VehicleDetection,
  CrashEvent,
  RideStatus,
  DetectionDirection,
  ThreatLevel,
  CrashSeverity,
  Prisma
} from "@prisma/client";

export class RideService {
  static async getRides(userId: string): Promise<
    Prisma.RideGetPayload<{
      include: {
        _count: {
          select: { locations: true; crashEvents: true; vehicleDetections: true };
        };
      };
    }>[]
  > {
    return prisma.ride.findMany({
      where: { userId },
      include: {
        _count: {
          select: { locations: true, crashEvents: true, vehicleDetections: true },
        },
      },
      orderBy: { startTime: "desc" },
    });
  }

  static async getRideById(
    id: string,
    userId: string
  ): Promise<Prisma.RideGetPayload<{
    include: {
      locations: true;
      crashEvents: true;
      vehicleDetections: true;
      helmet: true;
    };
  }> | null> {
    return prisma.ride.findFirst({
      where: { id, userId },
      include: {
        locations: {
          orderBy: { timestamp: "asc" },
        },
        crashEvents: true,
        vehicleDetections: {
          orderBy: { timestamp: "desc" },
        },
        helmet: true,
      },
    });
  }

  static async startRide(userId: string, data: { title?: string; helmetId?: string }): Promise<Ride> {
    // If there is an ongoing ride for this user, complete it first
    const ongoingRide = await prisma.ride.findFirst({
      where: { userId, status: RideStatus.ONGOING },
    });

    if (ongoingRide) {
      await prisma.ride.update({
        where: { id: ongoingRide.id },
        data: {
          status: RideStatus.COMPLETED,
          endTime: new Date(),
        },
      });
    }

    return prisma.ride.create({
      data: {
        userId,
        helmetId: data.helmetId,
        title: data.title || `Ride on ${new Date().toLocaleDateString()}`,
        status: RideStatus.ONGOING,
        startTime: new Date(),
        distance: 0.0,
        duration: 0,
        avgSpeed: 0.0,
        maxSpeed: 0.0,
      },
    });
  }

  static async endRide(
    id: string,
    userId: string,
    data: {
      distance: number;
      duration: number;
      avgSpeed: number;
      maxSpeed: number;
      status: RideStatus;
    }
  ): Promise<Ride> {
    const ride = await prisma.ride.findFirst({
      where: { id, userId },
    });

    if (!ride) {
      throw new Error("Ride not found or not owned by user");
    }

    return prisma.ride.update({
      where: { id },
      data: {
        distance: data.distance,
        duration: data.duration,
        avgSpeed: data.avgSpeed,
        maxSpeed: data.maxSpeed,
        status: data.status,
        endTime: new Date(),
      },
    });
  }

  static async addRideLocation(
    rideId: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number;
      altitude?: number;
      timestamp?: string;
    }
  ): Promise<RideLocation> {
    return prisma.rideLocation.create({
      data: {
        rideId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        altitude: data.altitude,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });
  }

  static async addMultipleLocations(
    rideId: string,
    locations: Array<{
      latitude: number;
      longitude: number;
      speed?: number;
      altitude?: number;
      timestamp?: string;
    }>
  ): Promise<Prisma.BatchPayload> {
    return prisma.rideLocation.createMany({
      data: locations.map((loc) => ({
        rideId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        speed: loc.speed,
        altitude: loc.altitude,
        timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date(),
      })),
    });
  }

  static async createVehicleDetection(data: {
    rideId: string;
    distance: number;
    direction: DetectionDirection;
    relativeSpeed?: number;
    threatLevel: ThreatLevel;
  }): Promise<VehicleDetection> {
    return prisma.vehicleDetection.create({
      data: {
        rideId: data.rideId,
        distance: data.distance,
        direction: data.direction,
        relativeSpeed: data.relativeSpeed,
        threatLevel: data.threatLevel,
        timestamp: new Date(),
      },
    });
  }

  static async getVehicleDetections(rideId: string): Promise<VehicleDetection[]> {
    return prisma.vehicleDetection.findMany({
      where: { rideId },
      orderBy: { timestamp: "desc" },
    });
  }

  static async createCrashEvent(data: {
    latitude: number;
    longitude: number;
    severity: CrashSeverity;
    rideId?: string;
    helmetId: string;
    timestamp?: string;
  }): Promise<CrashEvent> {
    return prisma.$transaction(async (tx) => {
      const crash = await tx.crashEvent.create({
        data: {
          latitude: data.latitude,
          longitude: data.longitude,
          severity: data.severity,
          rideId: data.rideId,
          helmetId: data.helmetId,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          resolved: false,
        },
      });

      // Get user from helmet relation to send notification
      const helmet = await tx.helmet.findUnique({
        where: { id: data.helmetId },
        select: { userId: true },
      });

      if (helmet?.userId) {
        // Create critical notification for crash
        await tx.notification.create({
          data: {
            userId: helmet.userId,
            title: "CRITICAL: Fall/Crash Detected",
            message: `A crash event with ${data.severity} severity was detected at latitude ${data.latitude}, longitude ${data.longitude}. Emergency contacts may be notified.`,
            type: "CRASH",
            read: false,
          },
        });
      }

      return crash;
    });
  }

  static async getCrashEvents(userId: string): Promise<
    Prisma.CrashEventGetPayload<{
      include: {
        helmet: true;
        ride: true;
      };
    }>[]
  > {
    return prisma.crashEvent.findMany({
      where: {
        helmet: {
          userId,
        },
      },
      include: {
        helmet: true,
        ride: true,
      },
      orderBy: { timestamp: "desc" },
    });
  }

  static async resolveCrashEvent(id: string, resolved: boolean): Promise<CrashEvent> {
    return prisma.crashEvent.update({
      where: { id },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null,
      },
    });
  }

  static async getAnalytics(userId: string): Promise<{
    summary: {
      totalDistance: number;
      totalDuration: number;
      maxSpeed: number;
      avgSpeed: number;
      ridesCount: number;
      crashCount: number;
      vehicleDetectionsCount: number;
    };
    chartData: {
      month: string;
      distance: number;
      duration: number;
      rides: number;
    }[];
  }> {
    const rides = await prisma.ride.findMany({
      where: { userId, status: RideStatus.COMPLETED },
    });

    const totalDistance = rides.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = rides.reduce((sum, r) => sum + r.duration, 0);
    const maxSpeed = rides.reduce((max, r) => Math.max(max, r.maxSpeed), 0);
    const avgSpeed = rides.length > 0
      ? rides.reduce((sum, r) => sum + r.avgSpeed, 0) / rides.length
      : 0;

    // Get counts
    const totalRidesCount = await prisma.ride.count({ where: { userId } });
    const crashEventsCount = await prisma.crashEvent.count({
      where: {
        helmet: { userId },
      },
    });
    const vehicleDetectionsCount = await prisma.vehicleDetection.count({
      where: {
        ride: { userId },
      },
    });

    // Monthly ride aggregates (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentRides = await prisma.ride.findMany({
      where: {
        userId,
        startTime: { gte: sixMonthsAgo },
        status: RideStatus.COMPLETED,
      },
      select: {
        startTime: true,
        distance: true,
        duration: true,
      },
      orderBy: { startTime: "asc" },
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyStats: Record<string, { month: string; distance: number; duration: number; rides: number }> = {};

    // Initialize 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyStats[key] = {
        month: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        distance: 0,
        duration: 0,
        rides: 0,
      };
    }

    recentRides.forEach((ride) => {
      const key = `${ride.startTime.getFullYear()}-${ride.startTime.getMonth()}`;
      if (monthlyStats[key]) {
        monthlyStats[key].distance = parseFloat((monthlyStats[key].distance + ride.distance).toFixed(2));
        monthlyStats[key].duration += ride.duration;
        monthlyStats[key].rides += 1;
      }
    });

    return {
      summary: {
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        totalDuration, // in seconds
        maxSpeed: parseFloat(maxSpeed.toFixed(2)),
        avgSpeed: parseFloat(avgSpeed.toFixed(2)),
        ridesCount: totalRidesCount,
        crashCount: crashEventsCount,
        vehicleDetectionsCount,
      },
      chartData: Object.values(monthlyStats),
    };
  }
}
