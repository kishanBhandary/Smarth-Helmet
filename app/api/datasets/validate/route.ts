import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseSpreadsheetBuffer, validateDatasetRows } from "@/lib/dataset-validator";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized. Company login required." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawRows = parseSpreadsheetBuffer(arrayBuffer);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "The uploaded spreadsheet contains no data rows." }, { status: 400 });
    }

    const { summary } = validateDatasetRows(rawRows);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      summary,
    });
  } catch (error: any) {
    console.error("Dataset validation error:", error);
    return NextResponse.json(
      { error: `Validation failed: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

