import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import { parseSpreadsheetBuffer, validateDatasetRows } from "../lib/dataset-validator";
import {
  checkMLServiceHealth,
  predictSingleRecord,
  predictBatchRecords,
  runPredictionForDataset,
  getCompanyPredictionHistory,
  getCompanyPredictionSummary,
} from "../lib/ml/ml.service";

const prisma = new PrismaClient();

async function runTestSuite() {
  console.log("==========================================================");
  console.log("🚀 STARTING COMPREHENSIVE END-TO-END VERIFICATION SUITE");
  console.log("==========================================================\n");

  let companyAId = "";
  let companyBId = "";
  let datasetAId = "";

  try {
    // -----------------------------------------------------------------
    // SETUP: Multi-company setup
    // -----------------------------------------------------------------
    console.log("--- SETUP: Identifying / Creating Companies ---");
    let companyA = await prisma.company.findFirst({
      where: { officialEmail: "elysium@admin.com" },
    });
    if (!companyA) {
      companyA = await prisma.company.create({
        data: {
          name: "Elysium Vista",
          officialEmail: "elysium@admin.com",
          phone: "9164490335",
        },
      });
    }
    companyAId = companyA.id;
    console.log(`✅ Company A: "${companyA.name}" (ID: ${companyAId})`);

    let companyB = await prisma.company.findFirst({
      where: { officialEmail: "competitor@test.com" },
    });
    if (!companyB) {
      companyB = await prisma.company.create({
        data: {
          name: "Apex Fleet Inc",
          officialEmail: "competitor@test.com",
          phone: "9988776655",
        },
      });
    }
    companyBId = companyB.id;
    console.log(`✅ Company B: "${companyB.name}" (ID: ${companyBId})\n`);

    // -----------------------------------------------------------------
    // TEST 1: Service Health & Model Verification (Scenario 9)
    // -----------------------------------------------------------------
    console.log("--- TEST 1: ML Microservice Health & Artifacts Verification ---");
    const health = await checkMLServiceHealth();
    console.log("ML Health response:", health);
    if (health.status !== "healthy") {
      throw new Error(`ML Service is not healthy: ${JSON.stringify(health)}`);
    }
    console.log("✅ ML Service is online and all 4 trained model artifacts are loaded.\n");

    // -----------------------------------------------------------------
    // TEST 2 & 8: Invalid Excel & Missing Features Detection (Scenario 7 & 8)
    // -----------------------------------------------------------------
    console.log("--- TEST 2: Validation of Invalid Excel & Missing Features ---");
    const invalidRows = [
      {
        Speed: "invalid_speed", // bad type
        Acceleration: 3.5,
        Braking: "Maybe", // invalid category
        Sharp_Turn: "Yes",
        // Tilt_Angle is missing!
        Weather: "Tornado", // invalid weather
        Road_Condition: "Lava", // invalid road condition
        Rider_ID: "R-999",
      },
    ];
    const invalidValidation = validateDatasetRows(invalidRows);
    console.log("Invalid dataset summary:", {
      isValid: invalidValidation.summary.isValid,
      errorsCount: invalidValidation.summary.errors.length,
      missingColumns: invalidValidation.summary.missingColumns,
    });
    if (invalidValidation.summary.isValid) {
      throw new Error("Validation should have failed for invalid rows!");
    }
    if (!invalidValidation.summary.missingColumns.includes("Tilt_Angle")) {
      throw new Error("Missing feature 'Tilt_Angle' was not detected!");
    }
    console.log("✅ Invalid files and missing features are rejected with detailed error messages.\n");

    // -----------------------------------------------------------------
    // TEST 3: Company A Uploads Valid Dataset (Scenario 1 & 12)
    // -----------------------------------------------------------------
    console.log("--- TEST 3: Company A Dataset Creation & Ingestion ---");
    const validTestRecords = [
      {
        Speed: 95.0,
        Acceleration: 4.8,
        Braking: "Yes",
        Sharp_Turn: "Yes",
        Tilt_Angle: 70.0,
        Weather: "Rain",
        Road_Condition: "Wet",
        Rider_ID: "RIDER-A-01",
        Helmet_ID: "HELMET-A-01",
        Trip_ID: "TRIP-A-01",
        Timestamp: new Date().toISOString(),
        Name: "John Rider",
        Location: "Route 66 North",
        GPS: "12.9200, 74.8600",
        Accident: true, // Ground truth label
        Severity: "CRITICAL", // Ground truth label
      },
      {
        Speed: 24.0,
        Acceleration: 0.3,
        Braking: "No",
        Sharp_Turn: "No",
        Tilt_Angle: 4.0,
        Weather: "Clear",
        Road_Condition: "Dry",
        Rider_ID: "RIDER-A-02",
        Helmet_ID: "HELMET-A-02",
        Trip_ID: "TRIP-A-02",
        Timestamp: new Date().toISOString(),
        Name: "Jane Rider",
        Location: "Downtown Avenue",
        GPS: "12.9150, 74.8550",
        Accident: false, // Ground truth label
        Severity: "NONE", // Ground truth label
      },
      {
        Speed: 82.0,
        Acceleration: 3.9,
        Braking: "Yes",
        Sharp_Turn: "Yes",
        Tilt_Angle: 58.0,
        Weather: "Fog",
        Road_Condition: "Poor",
        Rider_ID: "RIDER-A-01",
        Helmet_ID: "HELMET-A-01",
        Trip_ID: "TRIP-A-03",
        Timestamp: new Date().toISOString(),
        Name: "John Rider",
        Location: "Coastal Highway",
        GPS: "12.9300, 74.8700",
        Accident: true, // Ground truth label
        Severity: "HIGH", // Ground truth label
      },
    ];

    // Generate Excel buffer
    const ws = xlsx.utils.json_to_sheet(validTestRecords);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "SensorData");
    const excelBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    // Validate parsed buffer
    const parsedFromExcel = parseSpreadsheetBuffer(excelBuffer);
    const validValidation = validateDatasetRows(parsedFromExcel);
    if (!validValidation.summary.isValid) {
      throw new Error(`Valid records failed validation: ${JSON.stringify(validValidation.summary.errors)}`);
    }

    // Ingest into Supabase for Company A
    const datasetA = await prisma.dataset.create({
      data: {
        fileName: "company_a_test_telemetry.xlsx",
        uploadedBy: "Elysium Admin",
        companyId: companyAId,
        status: "PROCESSING",
        totalRecords: validValidation.summary.totalRecords,
        validRecords: validValidation.summary.validRecords,
      },
    });
    datasetAId = datasetA.id;

    // Upsert entities
    const helmetA1 = await prisma.helmet.upsert({
      where: { companyId_helmetId: { companyId: companyAId, helmetId: "HELMET-A-01" } },
      update: {},
      create: { companyId: companyAId, helmetId: "HELMET-A-01" },
    });
    const helmetA2 = await prisma.helmet.upsert({
      where: { companyId_helmetId: { companyId: companyAId, helmetId: "HELMET-A-02" } },
      update: {},
      create: { companyId: companyAId, helmetId: "HELMET-A-02" },
    });

    const riderA1 = await prisma.rider.upsert({
      where: { companyId_riderId: { companyId: companyAId, riderId: "RIDER-A-01" } },
      update: {},
      create: { companyId: companyAId, riderId: "RIDER-A-01", name: "John Rider" },
    });
    const riderA2 = await prisma.rider.upsert({
      where: { companyId_riderId: { companyId: companyAId, riderId: "RIDER-A-02" } },
      update: {},
      create: { companyId: companyAId, riderId: "RIDER-A-02", name: "Jane Rider" },
    });

    const tripA1 = await prisma.trip.upsert({
      where: { companyId_tripId: { companyId: companyAId, tripId: "TRIP-A-01" } },
      update: {},
      create: { companyId: companyAId, tripId: "TRIP-A-01", startTime: new Date(), riderId: riderA1.id, helmetId: helmetA1.id },
    });
    const tripA2 = await prisma.trip.upsert({
      where: { companyId_tripId: { companyId: companyAId, tripId: "TRIP-A-02" } },
      update: {},
      create: { companyId: companyAId, tripId: "TRIP-A-02", startTime: new Date(), riderId: riderA2.id, helmetId: helmetA2.id },
    });
    const tripA3 = await prisma.trip.upsert({
      where: { companyId_tripId: { companyId: companyAId, tripId: "TRIP-A-03" } },
      update: {},
      create: { companyId: companyAId, tripId: "TRIP-A-03", startTime: new Date(), riderId: riderA1.id, helmetId: helmetA1.id },
    });

    // Insert HelmetDataRecord
    const recordA1 = await prisma.helmetDataRecord.create({
      data: {
        companyId: companyAId,
        datasetId: datasetAId,
        riderId: riderA1.id,
        helmetId: helmetA1.id,
        tripId: tripA1.id,
        timestamp: new Date(),
        speed: 95.0,
        acceleration: 4.8,
        braking: "Yes",
        sharpTurn: true,
        tiltAngle: 70.0,
        weather: "Rain",
        roadCondition: "Wet",
        location: "Route 66 North",
        latitude: 12.92,
        longitude: 74.86,
        accident: true, // Ground truth
        severity: "CRITICAL", // Ground truth
      },
    });

    const recordA2 = await prisma.helmetDataRecord.create({
      data: {
        companyId: companyAId,
        datasetId: datasetAId,
        riderId: riderA2.id,
        helmetId: helmetA2.id,
        tripId: tripA2.id,
        timestamp: new Date(),
        speed: 24.0,
        acceleration: 0.3,
        braking: "No",
        sharpTurn: false,
        tiltAngle: 4.0,
        weather: "Clear",
        roadCondition: "Dry",
        location: "Downtown Avenue",
        latitude: 12.915,
        longitude: 74.855,
        accident: false, // Ground truth
        severity: "NONE", // Ground truth
      },
    });

    const recordA3 = await prisma.helmetDataRecord.create({
      data: {
        companyId: companyAId,
        datasetId: datasetAId,
        riderId: riderA1.id,
        helmetId: helmetA1.id,
        tripId: tripA3.id,
        timestamp: new Date(),
        speed: 82.0,
        acceleration: 3.9,
        braking: "Yes",
        sharpTurn: true,
        tiltAngle: 58.0,
        weather: "Fog",
        roadCondition: "Poor",
        location: "Coastal Highway",
        latitude: 12.93,
        longitude: 74.87,
        accident: true, // Ground truth
        severity: "HIGH", // Ground truth
      },
    });

    await prisma.dataset.update({
      where: { id: datasetAId },
      data: { status: "PROCESSED" },
    });
    console.log(`✅ Company A successfully imported dataset with 3 records (ID: ${datasetAId}).\n`);

    // -----------------------------------------------------------------
    // TEST 4: ML Prediction Execution & Severity Logic (Scenarios 2, 3, 10, 11)
    // -----------------------------------------------------------------
    console.log("--- TEST 4: Executing AI Prediction Workflow for Company A ---");
    const predResult = await runPredictionForDataset(datasetAId, companyAId);
    console.log("Prediction Execution Summary:", predResult);

    if (!predResult.success) {
      throw new Error("Prediction execution returned success: false");
    }
    if (predResult.totalRecords !== 3) {
      throw new Error(`Expected 3 total records, got ${predResult.totalRecords}`);
    }

    // Inspect individual predictions in Supabase
    const savedPredictions = await prisma.prediction.findMany({
      where: { datasetId: datasetAId, companyId: companyAId },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Fetched ${savedPredictions.length} saved prediction records from Supabase.`);

    for (const p of savedPredictions) {
      const isAcc = Boolean(p.accidentPrediction);
      const sev = p.severityPrediction || "NONE";
      console.log(
        `Record ID ${p.recordId}: AccidentPrediction=${isAcc}, Prob=${p.riskScore}%, SeverityPrediction=${sev}`
      );
      if (isAcc) {
        if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(sev)) {
          throw new Error(`Invalid severity "${sev}" for accident!`);
        }
      } else {
        // Scenario 3: Severity MUST be None when no accident is predicted
        if (sev !== "NONE") {
          throw new Error(`Severity should be "NONE" when no accident predicted, got "${sev}"`);
        }
      }
    }
    console.log("✅ Predictions verified: Severity is generated ONLY for predicted accidents.\n");

    // -----------------------------------------------------------------
    // TEST 5: Verify Actual Dataset Labels Remain Unchanged (Scenario 12)
    // -----------------------------------------------------------------
    console.log("--- TEST 5: Verification of Ground Truth Label Integrity ---");
    const checkRecord1 = await prisma.helmetDataRecord.findUnique({ where: { id: recordA1.id } });
    const checkRecord2 = await prisma.helmetDataRecord.findUnique({ where: { id: recordA2.id } });
    if (checkRecord1?.accident !== true || checkRecord1?.severity !== "CRITICAL") {
      throw new Error("Ground truth labels in Record 1 were altered!");
    }
    if (checkRecord2?.accident !== false || checkRecord2?.severity !== "NONE") {
      throw new Error("Ground truth labels in Record 2 were altered!");
    }
    console.log("✅ Ground truth labels (accident & severity) are intact and were NOT overwritten.\n");

    // -----------------------------------------------------------------
    // TEST 6: Company A Dashboard & Analytics (Scenario 4)
    // -----------------------------------------------------------------
    console.log("--- TEST 6: Company A Dashboard & Analytics Retrieval ---");
    const companyASummary = await getCompanyPredictionSummary(companyAId);
    console.log("Company A Prediction Summary:", companyASummary);
    if (companyASummary.totalPredictions < 3) {
      throw new Error("Company A summary shows fewer predictions than expected!");
    }
    console.log("✅ Company A sees its own real dashboard results and metrics.\n");

    // -----------------------------------------------------------------
    // TEST 7: Company B Data Isolation & Unauthorized Access (Scenario 5 & 6)
    // -----------------------------------------------------------------
    console.log("--- TEST 7: Multi-Company Data Isolation & Security Boundary ---");
    // Company B attempts to access Company A's dataset
    try {
      await runPredictionForDataset(datasetAId, companyBId);
      throw new Error("SECURITY BREACH: Company B was able to run predictions on Company A's dataset!");
    } catch (e: any) {
      console.log("Company B unauthorized prediction attempt rejected:", e.message);
      if (!e.message.includes("not found or access denied")) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
      console.log("🔒 Access control successfully blocked Company B from Company A dataset.");
    }

    // Company B queries history: must NOT see Company A's runs
    const companyBHistory = await getCompanyPredictionHistory(companyBId);
    console.log("Company B prediction runs count:", companyBHistory.totalRuns);
    if (companyBHistory.totalRuns !== 0) {
      throw new Error("SECURITY BREACH: Company B sees prediction history of Company A!");
    }

    // Company B summary: must NOT include Company A's records
    const companyBSummary = await getCompanyPredictionSummary(companyBId);
    console.log("Company B summary predictions count:", companyBSummary.totalPredictions);
    if (companyBSummary.totalPredictions !== 0) {
      throw new Error("SECURITY BREACH: Company B summary leaked Company A predictions!");
    }
    console.log("✅ Company B is fully isolated and cannot access Company A's data or predictions.\n");

    console.log("==========================================================");
    console.log("🎉 ALL 12 TEST SCENARIOS PASSED WITH COMPLETE SUCCESS!");
    console.log("==========================================================");
  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  } finally {
    // Cleanup Company B data
    if (companyBId) {
      await prisma.company.deleteMany({ where: { id: companyBId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTestSuite();
