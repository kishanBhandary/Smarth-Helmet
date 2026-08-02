import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { EmergencyService } from "@/services/emergency";
import { emergencyContactSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const PUT = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    const body = await req.json();
    
    // For update, we want to allow partial updates, so we make fields optional
    const validation = emergencyContactSchema.partial().safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await EmergencyService.updateContact(
      id,
      req.auth.user.id,
      validation.data
    );
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update emergency contact", 400);
  }
});

export const DELETE = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    await EmergencyService.deleteContact(id, req.auth.user.id);
    return successResponse({ message: "Emergency contact deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete emergency contact", 400);
  }
});
