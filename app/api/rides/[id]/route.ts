import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";
import { endRideSchema } from "@/lib/validations";

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
    const ride = await RideService.getRideById(id, req.auth.user.id);
    
    if (!ride) {
      return errorResponse("Ride not found", 404);
    }

    return successResponse(ride);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch ride details", 500);
  }
});

export const PUT = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    const body = await req.json();
    const validation = endRideSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await RideService.endRide(id, req.auth.user.id, validation.data);
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to end ride", 400);
  }
});
