import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotificationService } from "@/services/notification";

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
    const updated = await NotificationService.markAsRead(id, req.auth.user.id);
    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to mark notification as read", 400);
  }
});

export const DELETE = auth(async (req, ctx) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { id } = await (ctx as RouteContext).params;
    await NotificationService.deleteNotification(id, req.auth.user.id);
    return successResponse({ message: "Notification deleted successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete notification", 400);
  }
});
