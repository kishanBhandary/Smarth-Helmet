import prisma from "@/lib/prisma";

export class BluetoothService {
  static async getDevices(helmetId?: string) {
    return prisma.bluetoothDevice.findMany({
      where: helmetId ? { helmetId } : {},
      orderBy: { updatedAt: "desc" },
    });
  }

  static async pairDevice(data: { name: string; macAddress: string; type: "PHONE" | "HELMET" | "HEADSET" | "SENSOR" | "OTHER"; helmetId?: string }) {
    return prisma.bluetoothDevice.upsert({
      where: { macAddress: data.macAddress },
      update: {
        name: data.name,
        type: data.type,
        helmetId: data.helmetId,
        paired: true,
      },
      create: {
        name: data.name,
        macAddress: data.macAddress,
        type: data.type,
        helmetId: data.helmetId,
        paired: true,
        connected: false,
      },
    });
  }

  static async updateDeviceConnection(id: string, connected: boolean) {
    return prisma.bluetoothDevice.update({
      where: { id },
      data: { connected },
    });
  }

  static async deleteDevice(id: string) {
    return prisma.bluetoothDevice.delete({
      where: { id },
    });
  }

  static async logEvent(data: { event: string; status: "CONNECTED" | "DISCONNECTED" | "FAILED"; helmetId?: string; deviceId?: string; details?: string }) {
    return prisma.bluetoothLog.create({
      data: {
        event: data.event,
        status: data.status,
        helmetId: data.helmetId,
        deviceId: data.deviceId,
        details: data.details,
      },
    });
  }

  static async getLogs(options: { helmetId?: string; deviceId?: string; limit?: number } = {}) {
    const { helmetId, deviceId, limit = 50 } = options;
    return prisma.bluetoothLog.findMany({
      where: {
        ...(helmetId ? { helmetId } : {}),
        ...(deviceId ? { deviceId } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }
}
