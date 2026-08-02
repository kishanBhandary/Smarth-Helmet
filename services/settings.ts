import prisma from "@/lib/prisma";

export class SettingsService {
  static async getSettings(userId: string) {
    let settings = await prisma.settings.findUnique({
      where: { userId },
    });

    // If settings don't exist for some reason, create defaults
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId,
          fallDetection: true,
          blindSpotAlerts: true,
          autoEmergencyCall: false,
          emergencyDelay: 30,
          ledMode: "SOLID",
          audioVolume: 80,
        },
      });
    }

    return settings;
  }

  static async updateSettings(userId: string, data: {
    fallDetection?: boolean;
    blindSpotAlerts?: boolean;
    autoEmergencyCall?: boolean;
    emergencyDelay?: number;
    ledMode?: "SOLID" | "FLASHING" | "PULSE" | "OFF";
    audioVolume?: number;
  }) {
    return prisma.settings.update({
      where: { userId },
      data,
    });
  }
}
