import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runPredictionForDataset } from "@/lib/ml/ml.service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized. Company session required." }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const body = await req.json();
    const { datasetId } = body;

    if (!datasetId) {
      return NextResponse.json({ error: "datasetId is required." }, { status: 400 });
    }

    const result = await runPredictionForDataset(datasetId, companyId);

    if (!result.success) {
      return NextResponse.json(
        { error: (result as any).message || "Dataset contains no sensor records." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Predictions successfully executed and saved.",
      result,
    });
  } catch (error: any) {
    console.error("Prediction execution route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute predictions" },
      { status: 500 }
    );
  }
}

