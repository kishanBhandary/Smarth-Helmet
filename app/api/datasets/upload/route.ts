import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";
import { z } from "zod";

const excelRowSchema = z.object({
  Name: z.string().optional(),
  Company_ID: z.string().optional(),
  Company_Name: z.string().optional(),
  Rider_ID: z.string(),
  Helmet_ID: z.string(),
  Trip_ID: z.string(),
  Timestamp: z.union([z.string(), z.number(), z.date()]),
  Speed: z.number().optional().or(z.string().transform(v => parseFloat(v)).optional()),
  Acceleration: z.number().optional().or(z.string().transform(v => parseFloat(v)).optional()),
  Braking: z.string().optional(),
  Sharp_Turn: z.union([z.boolean(), z.string().transform(v => v.toLowerCase() === 'true')]).optional(),
  Tilt_Angle: z.number().optional().or(z.string().transform(v => parseFloat(v)).optional()),
  Impact: z.number().optional().or(z.string().transform(v => parseFloat(v)).optional()),
  GPS: z.string().optional(),
  Accident: z.union([
    z.boolean(),
    z.string().transform(v => v.toLowerCase() === 'yes' || v.toLowerCase() === 'true')
  ]).optional().default(false),
  Location: z.string().optional(),
  Weather: z.string().optional(),
  Road_Condition: z.string().optional(),
  Severity: z.string().toUpperCase().optional().default("NONE"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return NextResponse.json({ error: "The Excel file is empty" }, { status: 400 });
    }

    // Create dataset record
    const dataset = await prisma.dataset.create({
      data: {
        fileName: file.name,
        uploadedBy: session.user.id,
        companyId,
        status: "PROCESSING",
        totalRecords: rawData.length,
      }
    });

    let validRecords = 0;
    let invalidRecords = 0;
    let duplicateRecords = 0; // Simplified for now
    const validDataToInsert = [];

    for (const rawRow of rawData) {
      try {
        const parsed = excelRowSchema.parse(rawRow);
        
        let timestamp = new Date();
        if (parsed.Timestamp instanceof Date) {
          timestamp = parsed.Timestamp;
        } else if (typeof parsed.Timestamp === "number") {
          // Excel date serial number
          timestamp = new Date(Math.round((parsed.Timestamp - 25569) * 86400 * 1000));
        } else if (typeof parsed.Timestamp === "string") {
          timestamp = new Date(parsed.Timestamp);
        }

        if (isNaN(timestamp.getTime())) {
          throw new Error("Invalid timestamp");
        }

        // Parse GPS if available
        let latitude = null;
        let longitude = null;
        if (parsed.GPS) {
          const parts = parsed.GPS.split(",");
          if (parts.length === 2) {
            latitude = parseFloat(parts[0].trim());
            longitude = parseFloat(parts[1].trim());
          }
        }

        const severityMap: Record<string, string> = {
          "NONE": "NONE",
          "LOW": "LOW",
          "MEDIUM": "MEDIUM",
          "HIGH": "HIGH",
          "CRITICAL": "CRITICAL"
        };
        const mappedSeverity = severityMap[parsed.Severity as string] || "NONE";

        validDataToInsert.push({
          companyId,
          datasetId: dataset.id,
          riderId: parsed.Rider_ID,
          helmetId: parsed.Helmet_ID,
          tripId: parsed.Trip_ID,
          timestamp,
          speed: parsed.Speed || null,
          acceleration: parsed.Acceleration || null,
          braking: parsed.Braking || null,
          sharpTurn: parsed.Sharp_Turn || null,
          tiltAngle: parsed.Tilt_Angle || null,
          impact: parsed.Impact || null,
          gpsRaw: parsed.GPS || null,
          latitude: isNaN(latitude!) ? null : latitude,
          longitude: isNaN(longitude!) ? null : longitude,
          location: parsed.Location || null,
          weather: parsed.Weather || null,
          roadCondition: parsed.Road_Condition || null,
          accident: parsed.Accident,
          severity: mappedSeverity,
        });

        validRecords++;
      } catch (e) {
        invalidRecords++;
      }
    }

    // Process dependent entities (Riders, Helmets, Trips) efficiently
    const uniqueRiders = new Map();
    const uniqueHelmets = new Map();
    const uniqueTrips = new Map();

    for (const row of validDataToInsert) {
      if (!uniqueRiders.has(row.riderId)) {
        uniqueRiders.set(row.riderId, { riderId: row.riderId, name: rawData.find((r: any) => r.Rider_ID === row.riderId)?.Name || "Unknown", companyId, helmetId: row.helmetId });
      }
      if (!uniqueHelmets.has(row.helmetId)) {
        uniqueHelmets.set(row.helmetId, { helmetId: row.helmetId, companyId });
      }
      if (!uniqueTrips.has(row.tripId)) {
        uniqueTrips.set(row.tripId, { tripId: row.tripId, companyId, riderId: row.riderId, helmetId: row.helmetId, startTime: row.timestamp });
      } else {
        const trip = uniqueTrips.get(row.tripId);
        if (row.timestamp < trip.startTime) {
          trip.startTime = row.timestamp;
        }
      }
    }

    // Wrap in a transaction for data integrity
    await prisma.$transaction(async (tx) => {
      // Upsert Helmets
      for (const helmet of uniqueHelmets.values()) {
        await tx.helmet.upsert({
          where: { companyId_helmetId: { companyId, helmetId: helmet.helmetId } },
          update: {},
          create: helmet
        });
      }

      // Upsert Riders
      for (const rider of uniqueRiders.values()) {
        await tx.rider.upsert({
          where: { companyId_riderId: { companyId, riderId: rider.riderId } },
          update: { helmetId: rider.helmetId },
          create: rider
        });
      }

      // Upsert Trips
      for (const trip of uniqueTrips.values()) {
        await tx.trip.upsert({
          where: { companyId_tripId: { companyId, tripId: trip.tripId } },
          update: {}, // We might want to update endTime if we calculate it
          create: trip
        });
      }

      // We should ideally chunk this for very large datasets, but using createMany is fast
      const chunkSize = 5000;
      for (let i = 0; i < validDataToInsert.length; i += chunkSize) {
        const chunk = validDataToInsert.slice(i, i + chunkSize);
        
        // For HelmetDataRecord, we use createMany
        // We need to resolve the internal IDs for rider, helmet, and trip first for relation constraints
        
        // Let's first map internal IDs
        const dbRiders = await tx.rider.findMany({ where: { companyId } });
        const dbHelmets = await tx.helmet.findMany({ where: { companyId } });
        const dbTrips = await tx.trip.findMany({ where: { companyId } });

        const riderMap = new Map(dbRiders.map(r => [r.riderId, r.id]));
        const helmetMap = new Map(dbHelmets.map(h => [h.helmetId, h.id]));
        const tripMap = new Map(dbTrips.map(t => [t.tripId, t.id]));

        const recordsToInsert = chunk.map(row => ({
           ...row,
           riderId: riderMap.get(row.riderId)!,
           helmetId: helmetMap.get(row.helmetId)!,
           tripId: tripMap.get(row.tripId)!,
        }));

        await tx.helmetDataRecord.createMany({
          data: recordsToInsert as any, // Cast to any to bypass exact enum matching in type for now
          skipDuplicates: true
        });

        // Create incidents for records with accident=true
        const incidentRecords = recordsToInsert.filter(r => r.accident);
        if (incidentRecords.length > 0) {
           await tx.incident.createMany({
             data: incidentRecords.map(r => ({
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
               severity: r.severity
             })) as any,
             skipDuplicates: true
           });
        }
      }
    });

    // Update dataset status
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        status: "PROCESSED",
        validRecords,
        invalidRecords,
        duplicateRecords
      }
    });

    return NextResponse.json({
      success: true,
      totalRecords: rawData.length,
      validRecords,
      invalidRecords,
      duplicateRecords
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to process dataset" }, { status: 500 });
  }
}
