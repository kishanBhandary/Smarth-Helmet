import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { parseSpreadsheetBuffer, validateDatasetRows } from "@/lib/dataset-validator";
import { runPredictionForDataset } from "@/lib/ml/ml.service";

export async function POST(req: Request) {
  let dataset: any = null;
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
    dataset = await prisma.dataset.create({
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

    // Ensure company fallback entities exist to guarantee relational integrity
    const defaultHelmet = await prisma.helmet.upsert({
      where: { companyId_helmetId: { companyId, helmetId: "DEFAULT-HELMET" } },
      update: {},
      create: { companyId, helmetId: "DEFAULT-HELMET", status: "ACTIVE" },
    });

    const defaultRider = await prisma.rider.upsert({
      where: { companyId_riderId: { companyId, riderId: "DEFAULT-RIDER" } },
      update: {},
      create: { companyId, riderId: "DEFAULT-RIDER", name: "Default Fleet Rider", helmetId: defaultHelmet.id },
    });

    const defaultTrip = await prisma.trip.upsert({
      where: { companyId_tripId: { companyId, tripId: "DEFAULT-TRIP" } },
      update: {},
      create: {
        companyId,
        tripId: "DEFAULT-TRIP",
        startTime: new Date(),
        riderId: defaultRider.id,
        helmetId: defaultHelmet.id,
      },
    });

    // Batch insert Helmets in high-speed createMany
    const helmetBatch = Array.from(uniqueHelmets.values());
    if (helmetBatch.length > 0) {
      await prisma.helmet.createMany({
        data: helmetBatch.map((h) => ({
          companyId,
          helmetId: h.helmetId,
          status: "ACTIVE" as const,
        })),
        skipDuplicates: true,
      });
    }

    const dbHelmets = await prisma.helmet.findMany({ where: { companyId } });
    const helmetMap = new Map(dbHelmets.map((h) => [h.helmetId, h.id]));

    // Batch insert Riders
    const riderBatch = Array.from(uniqueRiders.values());
    if (riderBatch.length > 0) {
      await prisma.rider.createMany({
        data: riderBatch.map((r) => ({
          companyId,
          riderId: r.riderId,
          name: r.name,
          helmetId: helmetMap.get(r.helmetExtId) || defaultHelmet.id,
        })),
        skipDuplicates: true,
      });
    }

    const dbRiders = await prisma.rider.findMany({ where: { companyId } });
    const riderMap = new Map(dbRiders.map((r) => [r.riderId, r.id]));

    // Batch insert Trips
    const tripBatch = Array.from(uniqueTrips.values());
    if (tripBatch.length > 0) {
      await prisma.trip.createMany({
        data: tripBatch.map((t) => ({
          companyId,
          tripId: t.tripId,
          startTime: t.startTime,
          riderId: riderMap.get(t.riderExtId) || defaultRider.id,
          helmetId: helmetMap.get(t.helmetExtId) || defaultHelmet.id,
        })),
        skipDuplicates: true,
      });
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
      riderId: riderMap.get(row.Rider_ID) || defaultRider.id,
      helmetId: helmetMap.get(row.Helmet_ID) || defaultHelmet.id,
      tripId: tripMap.get(row.Trip_ID) || defaultTrip.id,
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
    if (dataset?.id) {
      try {
        await prisma.dataset.update({
          where: { id: dataset.id },
          data: {
            status: "FAILED",
            errorMessage: error?.message || "Failed to process dataset",
          },
        });
      } catch {}
    }
    return NextResponse.json({ error: `Failed to process dataset: ${error.message}` }, { status: 500 });
  }
}
