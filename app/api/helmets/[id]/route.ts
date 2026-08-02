import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { HelmetService } from "@/services/helmet";
import { updateHelmetSchema } from "@/lib/validations";

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
    const helmet = await HelmetService.getHelmetById(id, req.auth.user.id);
    
    if (!helmet) {
      return errorResponse("Helmet not found", 404);
    }
    
    return successResponse(helmet);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch helmet", 500);
  }
});

export const PUT = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    const body = await req.json();
    const validation = updateHelmetSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const updated = await HelmetService.updateHelmet(
      id,
      req.auth.user.id,
      validation.data
    );
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update helmet", 400);
  }
});

export const DELETE = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    await HelmetService.deleteHelmet(id, req.auth.user.id);
    return successResponse({ message: "Helmet deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete helmet", 400);
  }
});
