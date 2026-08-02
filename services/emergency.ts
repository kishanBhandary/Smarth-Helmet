import prisma from "@/lib/prisma";
import { EmergencyContact } from "@prisma/client";

export class EmergencyService {
  static async getContacts(userId: string): Promise<EmergencyContact[]> {
    return prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { isPrimary: "desc" },
    });
  }

  static async createContact(
    userId: string,
    data: {
      name: string;
      phone: string;
      relationship: string;
      email?: string;
      isPrimary?: boolean;
    }
  ): Promise<EmergencyContact> {
    return prisma.$transaction(async (tx) => {
      // If setting this one as primary, unset other primary contacts first
      if (data.isPrimary) {
        await tx.emergencyContact.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      // Check if this is the first contact. If so, make it primary automatically.
      const count = await tx.emergencyContact.count({ where: { userId } });
      const shouldBePrimary = count === 0 ? true : !!data.isPrimary;

      return tx.emergencyContact.create({
        data: {
          userId,
          name: data.name,
          phone: data.phone,
          relationship: data.relationship,
          email: data.email || null,
          isPrimary: shouldBePrimary,
        },
      });
    });
  }

  static async updateContact(
    id: string,
    userId: string,
    data: {
      name?: string;
      phone?: string;
      relationship?: string;
      email?: string;
      isPrimary?: boolean;
    }
  ): Promise<EmergencyContact> {
    return prisma.$transaction(async (tx) => {
      // Ensure contact belongs to user
      const contact = await tx.emergencyContact.findFirst({
        where: { id, userId },
      });

      if (!contact) {
        throw new Error("Emergency contact not found or not owned by user");
      }

      // If updating to primary, unset others
      if (data.isPrimary) {
        await tx.emergencyContact.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.emergencyContact.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          relationship: data.relationship,
          email: data.email !== undefined ? (data.email || null) : undefined,
          isPrimary: data.isPrimary,
        },
      });
    });
  }

  static async deleteContact(id: string, userId: string): Promise<void> {
    const contact = await prisma.emergencyContact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      throw new Error("Emergency contact not found or not owned by user");
    }

    await prisma.$transaction(async (tx) => {
      await tx.emergencyContact.delete({
        where: { id },
      });

      // If we deleted the primary contact, assign the next one as primary (if any exists)
      if (contact.isPrimary) {
        const nextContact = await tx.emergencyContact.findFirst({
          where: { userId },
        });
        if (nextContact) {
          await tx.emergencyContact.update({
            where: { id: nextContact.id },
            data: { isPrimary: true },
          });
        }
      }
    });
  }
}
