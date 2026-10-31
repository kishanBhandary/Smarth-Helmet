import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { parseSpreadsheetBuffer, validateDatasetRows } from "@/lib/dataset-validator";
import { runPredictionForDataset } from "@/lib/ml/ml.service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized. Company login required." }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const runPredictions = formData.get("runPredictions") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const rawRows = parseSpreadsheetBuffer(arrayBuffer);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "File contains no rows" }, { status: 400 });
    }

    const { summary, validRows } = validateDatasetRows(rawRows);

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows found to import.",
          summary,
        },
        { status: 400 }
      );
    }

    // Create Dataset record in Supabase
    const dataset = await prisma.dataset.create({
      data: {
        fileName: file.name,
        uploadedBy: session.user.name || session.user.email || session.user.id,
        companyId,
        status: "PROCESSING",
        totalRecords: summary.totalRecords,
        validRecords: summary.validRecords,
        invalidRecords: summary.invalidRecords,
        duplicateRecords: summary.duplicateRecords,
      },
    });

    // Extract unique riders, helmets, trips for efficient upserts
    const uniqueHelmets = new Map<string, any>();
    const uniqueRiders = new Map<string, any>();
    const uniqueTrips = new Map<string, any>();

    for (const row of validRows) {
      if (!uniqueHelmets.has(row.Helmet_ID)) {
        uniqueHelmets.set(row.Helmet_ID, {
          companyId,
          helmetId: row.Helmet_ID,
          status: "ACTIVE" as const,
        });
      }

      if (!uniqueRiders.has(row.Rider_ID)) {
        uniqueRiders.set(row.Rider_ID, {
          companyId,
          riderId: row.Rider_ID,
          name: row.Name || row.Rider_ID,
          helmetExtId: row.Helmet_ID,
        });
      } else {
        const existingRider = uniqueRiders.get(row.Rider_ID);
        if (row.Name && (!existingRider.name || existingRider.name.startsWith("RIDER-") || existingRider.name.startsWith("Rider "))) {
          existingRider.name = row.Name;
        }
        if (!existingRider.helmetExtId && row.Helmet_ID) {
          existingRider.helmetExtId = row.Helmet_ID;
        }
      }

      if (!uniqueTrips.has(row.Trip_ID)) {
        uniqueTrips.set(row.Trip_ID, {
          companyId,
          tripId: row.Trip_ID,
          startTime: row.Timestamp,
          riderExtId: row.Rider_ID,
          helmetExtId: row.Helmet_ID,
        });
      } else {
        const trip = uniqueTrips.get(row.Trip_ID);
        if (row.Timestamp < trip.startTime) {
          trip.startTime = row.Timestamp;
        }
      }
    }

    // Execute entity creation directly without interactive transaction (compatible with PgBouncer pooler)
    // Upsert Helmets first
    for (const h of uniqueHelmets.values()) {
      await prisma.helmet.upsert({
        where: { companyId_helmetId: { companyId, helmetId: h.helmetId } },
        update: {},
        create: h,
      });
    }

    // Fetch DB IDs for foreign key relations
    const dbHelmets = await prisma.helmet.findMany({ where: { companyId } });
    const helmetIdMap = new Map(dbHelmets.map((h) => [h.helmetId, h.id]));

    // Upsert Riders with assigned helmet relation
    for (const r of uniqueRiders.values()) {
      const hDbId = helmetIdMap.get(r.helmetExtId);
      await prisma.rider.upsert({
        where: { companyId_riderId: { companyId, riderId: r.riderId } },
        update: { 
          name: r.name,
          ...(hDbId ? { helmetId: hDbId } : {})
        },
        create: {
          companyId: r.companyId,
          riderId: r.riderId,
          name: r.name,
          ...(hDbId ? { helmetId: hDbId } : {})
        },
      });
    }

    const dbRiders = await prisma.rider.findMany({ where: { companyId } });
    const riderIdMap = new Map(dbRiders.map((r) => [r.riderId, r.id]));

    // Upsert Trips
    for (const t of uniqueTrips.values()) {
      const hDbId = helmetIdMap.get(t.helmetExtId);
      const rDbId = riderIdMap.get(t.riderExtId);
      if (hDbId && rDbId) {
        await prisma.trip.upsert({
          where: { companyId_tripId: { companyId, tripId: t.tripId } },
          update: {},
          create: {
            companyId,
            tripId: t.tripId,
            startTime: t.startTime,
            helmetId: hDbId,
            riderId: rDbId,
          },
        });
      }
    }

    const dbTrips = await prisma.trip.findMany({ where: { companyId } });
    const tripIdMap = new Map(dbTrips.map((t) => [t.tripId, t.id]));

    // Prepare records for createMany
    const recordsToInsert = validRows.map((r) => {
      const severityMap: Record<string, string> = {
        NONE: "NONE",
        LOW: "LOW",
        MEDIUM: "MEDIUM",
        HIGH: "HIGH",
        CRITICAL: "CRITICAL",
      };
      const mappedSeverity = severityMap[r.Severity || "NONE"] || "NONE";

      return {
        companyId,
        datasetId: dataset.id,
        riderId: riderIdMap.get(r.Rider_ID)!,
        helmetId: helmetIdMap.get(r.Helmet_ID)!,
        tripId: tripIdMap.get(r.Trip_ID)!,
        timestamp: r.Timestamp,
        speed: r.Speed,
        acceleration: r.Acceleration,
        braking: r.Braking,
        sharpTurn: r.Sharp_Turn === "Yes",
        tiltAngle: r.Tilt_Angle,
        weather: r.Weather,
        roadCondition: r.Road_Condition,
        impact: r.Impact,
        gpsRaw: r.GPS,
        latitude: r.Latitude,
        longitude: r.Longitude,
        location: r.Location,
        accident: r.Accident || false,
        severity: mappedSeverity as any,
      };
    });

    // Insert in chunks of 1000
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
      await prisma.helmetDataRecord.createMany({
        data: chunk,
        skipDuplicates: true,
      });

      // Create incidents for records where actual ground truth accident == true
      const incidentRecords = chunk.filter((r) => r.accident);
      if (incidentRecords.length > 0) {
        await prisma.incident.createMany({
          data: incidentRecords.map((r) => ({
            companyId: r.companyId,
            riderId: r.riderId,
            helmetId: r.helmetId,
            tripId: r.tripId,
            timestamp: r.timestamp,
            speed: r.speed,
            acceleration: r.acceleration,
            impact: r.impact,
            latitude: r.latitude,
            longitude: r.longitude,
            location: r.location,
            accident: r.accident,
            severity: r.severity,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Mark dataset as PROCESSED
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { status: "PROCESSED" },
    });

    let predictionSummary = null;
    let predictionError = null;
    if (runPredictions) {
      try {
        predictionSummary = await runPredictionForDataset(dataset.id, companyId);
      } catch (predErr: any) {
        console.error("Auto-prediction error after import:", predErr);
        predictionError = predErr.message || "Failed to communicate with ML service";
      }
    }

    return NextResponse.json({
      success: true,
      datasetId: dataset.id,
      fileName: file.name,
      summary,
      predictionSummary,
      predictionError,
    });
  } catch (error: any) {
    console.error("Dataset import error:", error);
    return NextResponse.json(
      { error: `Import failed: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

