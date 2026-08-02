import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { UserService } from "@/services/user";
import { updateUserSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const user = await UserService.getUserById(req.auth.user.id);
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Exclude password in response
    const { password: _, ...userWithoutPassword } = user as any;

    return successResponse(userWithoutPassword);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch user", 500);
  }
});

export const PUT = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await UserService.updateUser(req.auth.user.id, validation.data);
    
    // Exclude password in response
    const { password: _, ...userWithoutPassword } = updated as any;

    return successResponse(userWithoutPassword);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update user", 500);
  }
});
