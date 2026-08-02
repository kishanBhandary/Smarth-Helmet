import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { HelmetService } from "@/services/helmet";
import { createBatteryLogSchema } from "@/lib/validations";

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
    
    // Inject helmetId from route parameters into body for validation
    const bodyWithId = { ...body, helmetId: id };
    const validation = createBatteryLogSchema.safeParse(bodyWithId);
    
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const log = await HelmetService.logBattery(validation.data);
    return successResponse(log, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to log battery status", 400);
  }
});

export const GET = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    // Check if the helmet is owned by the user
    const helmet = await HelmetService.getHelmetById(id, req.auth.user.id);
    if (!helmet) {
      return errorResponse("Helmet not found", 404);
    }

    const logs = await HelmetService.getBatteryLogs(id);
    return successResponse(logs);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch battery logs", 500);
  }
});
