import { NextRequest } from "next/server";
import { registerUserSchema } from "@/lib/validations";
import { UserService } from "@/services/user";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validation = registerUserSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const { email, password, name } = validation.data;
    const user = await UserService.createUser({ email, password, name });

    // Exclude password in response
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword, 201);
  } catch (error: any) {
    return errorResponse(error.message || "An unexpected error occurred", 400);
  }
}
