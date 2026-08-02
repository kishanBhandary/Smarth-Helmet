import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BluetoothService } from "@/services/bluetooth";
import { createBluetoothLogSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const helmetId = searchParams.get("helmetId") || undefined;
    const deviceId = searchParams.get("deviceId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const logs = await BluetoothService.getLogs({ helmetId, deviceId, limit });
    return successResponse(logs);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch Bluetooth logs", 500);
  }
});

export const POST = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = createBluetoothLogSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const log = await BluetoothService.logEvent(validation.data);
    return successResponse(log, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to log Bluetooth event", 400);
  }
});
