import { auth } from "@/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { BluetoothService } from "@/services/bluetooth";
import { pairBluetoothDeviceSchema } from "@/lib/validations";

export const GET = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const helmetId = searchParams.get("helmetId") || undefined;
    const devices = await BluetoothService.getDevices(helmetId);
    return successResponse(devices);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch Bluetooth devices", 500);
  }
});

export const POST = auth(async (req) => {
  if (!req.auth || !req.auth.user?.id) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const validation = pairBluetoothDeviceSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation error", 400, validation.error.format());
    }

    const device = await BluetoothService.pairDevice(validation.data);
    return successResponse(device, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to pair Bluetooth device", 400);
  }
});
