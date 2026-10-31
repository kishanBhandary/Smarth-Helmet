import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCompanyPredictionHistory } from "@/lib/ml/ml.service";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized. Company session required." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const datasetId = searchParams.get("datasetId") || undefined;

    const data = await getCompanyPredictionHistory(session.user.companyId, {
      limit,
      offset,
      datasetId,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("Prediction history route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prediction history" },
      { status: 500 }
    );
  }
}

