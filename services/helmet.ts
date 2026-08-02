import prisma from "@/lib/prisma";
import { Helmet, Sensor, BatteryLog, HelmetStatus, SensorStatus, SensorType } from "@prisma/client";

export class HelmetService {
  static async getHelmets(userId: string): Promise<Helmet[]> {
    return prisma.helmet.findMany({
      where: { userId },
      include: {
        sensors: true,
        bluetoothDevices: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getHelmetById(id: string, userId?: string): Promise<Helmet | null> {
    return prisma.helmet.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
      include: {
        sensors: true,
        bluetoothDevices: true,
        batteryLogs: {
          take: 50,
          orderBy: { timestamp: "desc" },
        },
      },
    });
  }

  static async createHelmet(userId: string, data: { name: string; serialNumber: string }): Promise<Helmet> {
    // Check if serial number already registered
    const existing = await prisma.helmet.findUnique({
      where: { serialNumber: data.serialNumber },
    });

    if (existing) {
      if (existing.userId === userId) {
        throw new Error("This helmet is already registered to your account");
      }
      throw new Error("This helmet is registered to another user");
    }

    return prisma.$transaction(async (tx) => {
      const helmet = await tx.helmet.create({
        data: {
          name: data.name,
          serialNumber: data.serialNumber,
          userId,
          status: HelmetStatus.INACTIVE,
          batteryLevel: 100,
        },
      });

      // Seed default sensors for the helmet
      const sensorTypes: Array<{ type: SensorType; name: string }> = [
        { type: SensorType.ACCELEROMETER, name: "3-Axis Accelerometer" },
        { type: SensorType.GYROSCOPE, name: "3-Axis Gyroscope" },
        { type: SensorType.GPS, name: "GPS Module" },
        { type: SensorType.IMU, name: "IMU Sensor" },
        { type: SensorType.BLIND_SPOT, name: "Rear Radar Blind Spot" },
        { type: SensorType.HEART_RATE, name: "Biometric Heart Rate" },
      ];

      await tx.sensor.createMany({
        data: sensorTypes.map((s) => ({
          helmetId: helmet.id,
          type: s.type,
          name: s.name,
          status: SensorStatus.OK,
        })),
      });

      return helmet;
    });
  }

  static async updateHelmet(
    id: string,
    userId: string,
    data: {
      name?: string;
      status?: HelmetStatus;
      batteryLevel?: number;
      firmwareVersion?: string;
    }
  ): Promise<Helmet> {
    // Ensure helmet belongs to user
    const helmet = await prisma.helmet.findFirst({
      where: { id, userId },
    });

    if (!helmet) {
      throw new Error("Helmet not found or not owned by user");
    }

    return prisma.helmet.update({
      where: { id },
      data: {
        ...data,
        lastSync: new Date(),
      },
    });
  }

  static async deleteHelmet(id: string, userId: string): Promise<Helmet> {
    const helmet = await prisma.helmet.findFirst({
      where: { id, userId },
    });

    if (!helmet) {
      throw new Error("Helmet not found or not owned by user");
    }

    return prisma.helmet.delete({
      where: { id },
    });
  }

  static async logBattery(data: {
    helmetId: string;
    batteryLevel: number;
    voltage?: number;
    charging: boolean;
  }): Promise<BatteryLog> {
    return prisma.$transaction(async (tx) => {
      // Log battery status
      const log = await tx.batteryLog.create({
        data: {
          helmetId: data.helmetId,
          batteryLevel: data.batteryLevel,
          voltage: data.voltage,
          charging: data.charging,
        },
      });

      // Update helmet battery status
      await tx.helmet.update({
        where: { id: data.helmetId },
        data: {
          batteryLevel: data.batteryLevel,
          status: data.charging ? HelmetStatus.CHARGING : HelmetStatus.ACTIVE,
          lastSync: new Date(),
        },
      });

      return log;
    });
  }

  static async getBatteryLogs(helmetId: string, limit = 50): Promise<BatteryLog[]> {
    return prisma.batteryLog.findMany({
      where: { helmetId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }
}
