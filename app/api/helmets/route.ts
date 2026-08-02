import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { HelmetService } from "@/services/helmet";
import { createHelmetSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const helmets = await HelmetService.getHelmets(req.auth.user.id);
    return successResponse(helmets);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch helmets", 500);
  }
});

export const POST = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = createHelmetSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const helmet = await HelmetService.createHelmet(
      req.auth.user.id,
      validation.data
    );
    return successResponse(helmet, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to register helmet", 400);
  }
});
