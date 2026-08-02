import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { EmergencyService } from "@/services/emergency";
import { emergencyContactSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const contacts = await EmergencyService.getContacts(req.auth.user.id);
    return successResponse(contacts);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch emergency contacts", 500);
  }
});

export const POST = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = emergencyContactSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const contact = await EmergencyService.createContact(
      req.auth.user.id,
      validation.data
    );
    return successResponse(contact, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to add emergency contact", 400);
  }
});
