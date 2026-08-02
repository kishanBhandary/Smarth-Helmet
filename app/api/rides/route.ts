import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";
import { startRideSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const rides = await RideService.getRides(req.auth.user.id);
    return successResponse(rides);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch rides", 500);
  }
});

export const POST = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = startRideSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const ride = await RideService.startRide(req.auth.user.id, validation.data);
    return successResponse(ride, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to start ride", 400);
  }
});
