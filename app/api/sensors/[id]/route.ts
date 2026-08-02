import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { SensorService } from "@/services/sensor";
import { updateSensorSchema } from "@/lib/validations";

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
    const validation = updateSensorSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await SensorService.updateSensorStatus(id, validation.data.status);
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update sensor status", 400);
  }
});
