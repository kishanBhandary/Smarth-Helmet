import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { SensorService } from "@/services/sensor";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const helmetId = searchParams.get("helmetId");
    
    if (!helmetId) {
      return errorResponse("helmetId parameter is required", 400);
    }

    const sensors = await SensorService.getSensorsByHelmet(helmetId);
    return successResponse(sensors);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch sensors", 500);
  }
});
