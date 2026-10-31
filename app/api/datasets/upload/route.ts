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

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const rawData = parseSpreadsheetBuffer(buffer);

    if (rawData.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty" }, { status: 400 });
    }

    const { summary, validRows } = validateDatasetRows(rawData);

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows found in dataset.",
          summary,
        },
        { status: 400 }
      );
    }

    // Create dataset record
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

    // Unique maps for entities
    const uniqueRiders = new Map<string, any>();
    const uniqueHelmets = new Map<string, any>();
    const uniqueTrips = new Map<string, any>();

    for (const row of validRows) {
      if (!uniqueRiders.has(row.Rider_ID)) {
        uniqueRiders.set(row.Rider_ID, {
          riderId: row.Rider_ID,
          name: row.Name || row.Rider_ID,
          companyId,
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
      if (!uniqueHelmets.has(row.Helmet_ID)) {
        uniqueHelmets.set(row.Helmet_ID, {
          helmetId: row.Helmet_ID,
          companyId,
          status: "ACTIVE" as const,
        });
      }
      if (!uniqueTrips.has(row.Trip_ID)) {
        uniqueTrips.set(row.Trip_ID, {
          tripId: row.Trip_ID,
          companyId,
          riderExtId: row.Rider_ID,
          helmetExtId: row.Helmet_ID,
          startTime: row.Timestamp,
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
    for (const helmet of uniqueHelmets.values()) {
      await prisma.helmet.upsert({
        where: { companyId_helmetId: { companyId, helmetId: helmet.helmetId } },
        update: {},
        create: helmet,
      });
    }

    const dbHelmets = await prisma.helmet.findMany({ where: { companyId } });
    const helmetMap = new Map(dbHelmets.map((h) => [h.helmetId, h.id]));

    // Upsert Riders with assigned helmet relation
    for (const rider of uniqueRiders.values()) {
      const hDbId = helmetMap.get(rider.helmetExtId);
      await prisma.rider.upsert({
        where: { companyId_riderId: { companyId, riderId: rider.riderId } },
        update: { 
          name: rider.name,
          ...(hDbId ? { helmetId: hDbId } : {})
        },
        create: {
          companyId: rider.companyId,
          riderId: rider.riderId,
          name: rider.name,
          ...(hDbId ? { helmetId: hDbId } : {})
        },
      });
    }

    const dbRiders = await prisma.rider.findMany({ where: { companyId } });
    const riderMap = new Map(dbRiders.map((r) => [r.riderId, r.id]));

    // Upsert Trips
    for (const trip of uniqueTrips.values()) {
      const rId = riderMap.get(trip.riderExtId);
      const hId = helmetMap.get(trip.helmetExtId);
      if (rId && hId) {
        await prisma.trip.upsert({
          where: { companyId_tripId: { companyId, tripId: trip.tripId } },
          update: {},
          create: {
            companyId,
            tripId: trip.tripId,
            startTime: trip.startTime,
            riderId: rId,
            helmetId: hId,
          },
        });
      }
    }

    const dbTrips = await prisma.trip.findMany({ where: { companyId } });
    const tripMap = new Map(dbTrips.map((t) => [t.tripId, t.id]));

    const severityMap: Record<string, string> = {
      NONE: "NONE",
      LOW: "LOW",
      MEDIUM: "MEDIUM",
      HIGH: "HIGH",
      CRITICAL: "CRITICAL",
    };

    const recordsToInsert = validRows.map((row) => ({
      companyId,
      datasetId: dataset.id,
      riderId: riderMap.get(row.Rider_ID)!,
      helmetId: helmetMap.get(row.Helmet_ID)!,
      tripId: tripMap.get(row.Trip_ID)!,
      timestamp: row.Timestamp,
      speed: row.Speed,
      acceleration: row.Acceleration,
      braking: row.Braking,
      sharpTurn: row.Sharp_Turn === "Yes",
      tiltAngle: row.Tilt_Angle,
      impact: row.Impact,
      gpsRaw: row.GPS,
      latitude: row.Latitude,
      longitude: row.Longitude,
      location: row.Location,
      weather: row.Weather,
      roadCondition: row.Road_Condition,
      accident: row.Accident || false,
      severity: (severityMap[row.Severity || "NONE"] || "NONE") as any,
    }));

    const chunkSize = 1000;
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      const chunk = recordsToInsert.slice(i, i + chunkSize);
      await prisma.helmetDataRecord.createMany({
        data: chunk,
        skipDuplicates: true,
      });

      // Create incidents for records where actual accident == true
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

    // Update dataset status
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { status: "PROCESSED" },
    });

    // Run ML predictions
    let predictionResult = null;
    try {
      predictionResult = await runPredictionForDataset(dataset.id, companyId);
    } catch (mlErr: any) {
      console.warn("Auto ML prediction skipped or failed:", mlErr.message);
    }

    return NextResponse.json({
      success: true,
      datasetId: dataset.id,
      totalRecords: summary.totalRecords,
      validRecords: summary.validRecords,
      invalidRecords: summary.invalidRecords,
      duplicateRecords: summary.duplicateRecords,
      predictionSummary: predictionResult,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: `Failed to process dataset: ${error.message}` }, { status: 500 });
  }
}
