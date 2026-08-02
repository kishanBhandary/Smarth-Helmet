import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";
import { createCrashEventSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const crashes = await RideService.getCrashEvents(req.auth.user.id);
    return successResponse(crashes);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch crash events", 500);
  }
});

export const POST = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = createCrashEventSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const crash = await RideService.createCrashEvent(validation.data);
    return successResponse(crash, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to report crash event", 400);
  }
});
