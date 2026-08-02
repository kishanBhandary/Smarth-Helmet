import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { RideService } from "@/services/ride";
import { addRideLocationSchema, addMultipleRideLocationsSchema } from "@/lib/validations";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const POST = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    const body = await req.json();

    // Support both single coordinate uploads and bulk coordinates (efficient for GPS streaming)
    if (body.locations && Array.isArray(body.locations)) {
      const validation = addMultipleRideLocationsSchema.safeParse(body);
      if (!validation.success) {
        return errorResponse("Validation error", 400, validation.error.format());
      }
      const added = await RideService.addMultipleLocations(id, validation.data.locations);
      return successResponse({ count: added }, 201);
    } else {
      const validation = addRideLocationSchema.safeParse(body);
      if (!validation.success) {
        return errorResponse("Validation error", 400, validation.error.format());
      }
      const location = await RideService.addRideLocation(id, validation.data);
      return successResponse(location, 201);
    }
  } catch (error: any) {
    return errorResponse(error.message || "Failed to log location", 400);
  }
});
