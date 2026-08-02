import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { SettingsService } from "@/services/settings";
import { updateSettingsSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const settings = await SettingsService.getSettings(req.auth.user.id);
    return successResponse(settings);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch settings", 500);
  }
});

export const PUT = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = updateSettingsSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await SettingsService.updateSettings(
      req.auth.user.id,
      validation.data
    );
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update settings", 400);
  }
});
