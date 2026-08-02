import prisma from "@/lib/prisma";

export class NotificationService {
  static async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: "CRASH" | "BATTERY" | "SYSTEM" | "BLUETOOTH" | "ALERT";
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        read: false,
      },
    });
  }

  static async markAsRead(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error("Notification not found or not owned by user");
    }

    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  static async deleteNotification(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new Error("Notification not found or not owned by user");
    }

    return prisma.notification.delete({
      where: { id },
    });
  }
}
