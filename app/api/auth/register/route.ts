import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  companyName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data provided", details: result.error.errors },
        { status: 400 }
      );
    }

    const { companyName, email, phone, password } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Check if company already exists
    const existingCompany = await prisma.company.findUnique({
      where: { officialEmail: email },
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: "A company with this official email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Company and Admin User in a transaction
    await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: companyName,
          officialEmail: email,
          phone,
        },
      });

      await tx.user.create({
        data: {
          email,
          name: "Admin User", // Placeholder or from form if we had it
          password: hashedPassword,
          role: "COMPANY_ADMIN",
          companyId: newCompany.id,
          permissions: [
            "VIEW_DASHBOARD",
            "UPLOAD_DATASET",
            "VIEW_DATASETS",
            "VIEW_RIDERS",
            "VIEW_HELMETS",
            "VIEW_TRIPS",
            "VIEW_INCIDENTS",
            "VIEW_ANALYTICS",
            "VIEW_REPORTS",
            "MANAGE_EMPLOYEES",
          ],
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
