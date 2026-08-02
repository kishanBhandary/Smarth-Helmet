import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { NotificationService } from "@/services/notification";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const notifications = await NotificationService.getNotifications(req.auth.user.id);
    return successResponse(notifications);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch notifications", 500);
  }
});

export const PUT = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    await NotificationService.markAllAsRead(req.auth.user.id);
    return successResponse({ message: "All notifications marked as read" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to mark notifications as read", 400);
  }
});
