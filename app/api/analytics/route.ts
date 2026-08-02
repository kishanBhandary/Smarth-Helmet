import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const analytics = await RideService.getAnalytics(req.auth.user.id);
    return successResponse(analytics);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch analytics", 500);
  }
});
