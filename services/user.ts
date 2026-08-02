import prisma from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { User, Role, Prisma } from "@prisma/client";

export class UserService {
  static async createUser(data: { email: string; password?: string; name?: string }): Promise<User> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Create user and default settings in a transaction
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name || data.email.split("@")[0],
          role: Role.USER,
        },
      });

      // Initialize default settings
      await tx.settings.create({
        data: {
          userId: user.id,
          fallDetection: true,
          blindSpotAlerts: true,
          autoEmergencyCall: false,
          emergencyDelay: 30,
          ledMode: "SOLID",
          audioVolume: 80,
        },
      });

      return user;
    });
  }

  static async getUserById(id: string): Promise<Prisma.UserGetPayload<{
    include: {
      settings: true;
      _count: {
        select: { helmets: true; rides: true; emergencyContacts: true };
      };
    };
  }> | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: { helmets: true, rides: true, emergencyContacts: true },
        },
      },
    });
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async updateUser(
    id: string,
    data: { name?: string; email?: string; image?: string; role?: Role }
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }
}
