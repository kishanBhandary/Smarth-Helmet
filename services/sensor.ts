import prisma from "@/lib/prisma";

export class SensorService {
  static async getSensorsByHelmet(helmetId: string) {
    return prisma.sensor.findMany({
      where: { helmetId },
      orderBy: { type: "asc" },
    });
  }

  static async updateSensorStatus(id: string, status: "OK" | "ERROR" | "OFFLINE") {
    return prisma.sensor.update({
      where: { id },
      data: { status },
    });
  }

  static async reportSensorStatus(helmetId: string, type: "ACCELEROMETER" | "GYROSCOPE" | "GPS" | "IMU" | "BLIND_SPOT" | "HEART_RATE", status: "OK" | "ERROR" | "OFFLINE") {
    const sensor = await prisma.sensor.findFirst({
      where: { helmetId, type },
    });

    if (!sensor) {
      throw new Error(`Sensor of type ${type} not found for helmet ${helmetId}`);
    }

    return prisma.sensor.update({
      where: { id: sensor.id },
      data: { status },
    });
  }
}
