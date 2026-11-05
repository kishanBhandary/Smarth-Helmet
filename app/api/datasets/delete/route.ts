import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized. Company login required." }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const body = await req.json();
    const { datasetId } = body;

    if (!datasetId) {
      return NextResponse.json({ error: "datasetId is required" }, { status: 400 });
    }

    // Verify dataset belongs to user's company
    const dataset = await prisma.dataset.findFirst({
      where: { id: datasetId, companyId },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found or unauthorized" }, { status: 404 });
    }

    // Cascading delete
    await prisma.prediction.deleteMany({ where: { datasetId, companyId } });
    await prisma.predictionRun.deleteMany({ where: { datasetId, companyId } });
    await prisma.helmetDataRecord.deleteMany({ where: { datasetId, companyId } });
    await prisma.dataset.delete({ where: { id: datasetId } });

    return NextResponse.json({ success: true, message: "Dataset deleted successfully" });
  } catch (error: any) {
    console.error("Delete dataset error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete dataset" }, { status: 500 });
  }
}
