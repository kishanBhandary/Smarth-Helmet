import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";
import { resolveCrashEventSchema } from "@/lib/validations";

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
    const validation = resolveCrashEventSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await RideService.resolveCrashEvent(id, validation.data.resolved);
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update crash event status", 400);
  }
});
