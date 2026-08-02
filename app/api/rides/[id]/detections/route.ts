import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";
import { createVehicleDetectionSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const GET = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    const detections = await RideService.getVehicleDetections(id);
    return successResponse(detections);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch vehicle detections", 500);
  }
});

export const POST = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    const body = await req.json();
    
    // Inject rideId into validation context
    const bodyWithId = { ...body, rideId: id };
    const validation = createVehicleDetectionSchema.safeParse(bodyWithId);
    
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const detection = await RideService.createVehicleDetection(validation.data);
    return successResponse(detection, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to log vehicle detection", 400);
  }
});
