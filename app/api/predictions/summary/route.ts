import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCompanyPredictionSummary } from "@/lib/ml/ml.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized. Company session required." }, { status: 401 });
    }

    const summary = await getCompanyPredictionSummary(session.user.companyId);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error("Prediction summary route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prediction summary" },
      { status: 500 }
    );
  }
}

