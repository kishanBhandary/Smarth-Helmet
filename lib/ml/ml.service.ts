import prisma from "@/lib/prisma";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export interface SensorRecordInput {
  id?: string;
  Speed?: number | null;
  speed?: number | null;
  Acceleration?: number | null;
  acceleration?: number | null;
  Braking?: string | boolean | null;
  braking?: string | boolean | null;
  Sharp_Turn?: string | boolean | null;
  sharp_turn?: string | boolean | null;
  sharpTurn?: string | boolean | null;
  Tilt_Angle?: number | null;
  tilt_angle?: number | null;
  tiltAngle?: number | null;
  Weather?: string | null;
  weather?: string | null;
  Road_Condition?: string | null;
  road_condition?: string | null;
  roadCondition?: string | null;
  riderId?: string | null;
  helmetId?: string | null;
  tripId?: string | null;
  timestamp?: Date | string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PredictionResult {
  id?: string;
  success: boolean;
  accident: "Yes" | "No";
  accident_probability: number;
  severity: "Critical" | "High" | "Medium" | "Low" | "None";
  error?: string;
}

export interface BatchPredictionResponse {
  success: boolean;
  total: number;
  predicted_accidents: number;
  predicted_no_accidents: number;
  model_version: string;
  predictions: PredictionResult[];
}

/**
 * Health check on the Python FastAPI service.
 */
export async function checkMLServiceHealth() {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      return { status: "unreachable", error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (error: any) {
    return { status: "offline", error: error.message };
  }
}

/**
 * Calls FastAPI to predict single record.
 */
export async function predictSingleRecord(record: SensorRecordInput): Promise<PredictionResult> {
  const res = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ML Service error: ${res.status} - ${errText}`);
  }

  return await res.json();
}

/**
 * Calls FastAPI to predict a batch of sensor records.
 * Splits into chunks of 5000 to prevent payload limits.
 */
export async function predictBatchRecords(records: SensorRecordInput[]): Promise<BatchPredictionResponse> {
  if (records.length === 0) {
    return {
      success: true,
      total: 0,
      predicted_accidents: 0,
      predicted_no_accidents: 0,
      model_version: "v1.0",
      predictions: [],
    };
  }

  const CHUNK_SIZE = 5000;
  const allPredictions: PredictionResult[] = [];
  let totalAccidents = 0;
  let totalNoAccidents = 0;
  let modelVersion = "v1.0";

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const res = await fetch(`${ML_SERVICE_URL}/predict/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: chunk }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ML batch service error: ${res.status} - ${errText}`);
    }

    const data: BatchPredictionResponse = await res.json();
    modelVersion = data.model_version || modelVersion;
    totalAccidents += data.predicted_accidents;
    totalNoAccidents += data.predicted_no_accidents;
    allPredictions.push(...data.predictions);
  }

  return {
    success: true,
    total: records.length,
    predicted_accidents: totalAccidents,
    predicted_no_accidents: totalNoAccidents,
    model_version: modelVersion,
    predictions: allPredictions,
  };
}

/**
 * Executes ML prediction workflow for a company's dataset,
 * saving results securely linked to companyId and datasetId.
 */
export async function runPredictionForDataset(datasetId: string, companyId: string) {
  // Verify dataset ownership
  const dataset = await prisma.dataset.findFirst({
    where: { id: datasetId, companyId },
  });

  if (!dataset) {
    throw new Error("Dataset not found or access denied.");
  }

  // Load imported sensor records
  const records = await prisma.helmetDataRecord.findMany({
    where: { datasetId, companyId },
  });

  if (records.length === 0) {
    return {
      success: false,
      runId: "",
      datasetId,
      totalRecords: 0,
      predictedAccidents: 0,
      predictedNoAccidents: 0,
      modelVersion: "v1.0.0",
      message: "No sensor records found in dataset. Please upload a valid dataset with records.",
    };
  }

  // Idempotently clear previous predictions for this dataset to avoid duplicate counts
  await prisma.prediction.deleteMany({
    where: { datasetId, companyId },
  });
  await prisma.predictionRun.deleteMany({
    where: { datasetId, companyId },
  });

  // Prepare input records for ML model
  const inputs: SensorRecordInput[] = records.map((r) => ({
    id: r.id,
    speed: r.speed,
    acceleration: r.acceleration,
    braking: r.braking,
    sharpTurn: r.sharpTurn,
    tiltAngle: r.tiltAngle,
    weather: r.weather,
    roadCondition: r.roadCondition,
    riderId: r.riderId,
    helmetId: r.helmetId,
    tripId: r.tripId,
  }));

  // Run batch inference through FastAPI service
  const batchResult = await predictBatchRecords(inputs);

  // Map predictions to records
  const recordMap = new Map(records.map((r) => [r.id, r]));

  // Create a PredictionRun record
  const predictionRun = await prisma.predictionRun.create({
    data: {
      companyId,
      datasetId,
      totalRecords: batchResult.total,
      predictedAccidents: batchResult.predicted_accidents,
      predictedNoAccidents: batchResult.predicted_no_accidents,
      modelVersion: batchResult.model_version,
      status: "COMPLETED",
    },
  });

  // Prepare predictions to insert into Supabase
  const predictionsData = batchResult.predictions.map((p) => {
    const orig = recordMap.get(p.id!);
    const isAccident = p.accident === "Yes";

    return {
      companyId,
      datasetId,
      predictionRunId: predictionRun.id,
      recordId: p.id,
      riderId: orig?.riderId || null,
      helmetId: orig?.helmetId || null,
      tripId: orig?.tripId || null,
      predictedAccident: p.accident,
      accidentPrediction: isAccident,
      accidentProbability: p.accident_probability,
      predictedSeverity: p.severity,
      severityPrediction: (["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
        p.severity.toUpperCase()
      )
        ? p.severity.toUpperCase()
        : "NONE") as any,
      riskScore: p.accident_probability,
      confidence: p.accident_probability,
      modelVersion: batchResult.model_version,
      sensorFeatures: {
        Speed: orig?.speed,
        Acceleration: orig?.acceleration,
        Braking: orig?.braking,
        Sharp_Turn: orig?.sharpTurn,
        Tilt_Angle: orig?.tiltAngle,
        Weather: orig?.weather,
        Road_Condition: orig?.roadCondition,
      },
    };
  });

  // Insert in chunks of 2000
  const INSERT_CHUNK = 2000;
  for (let i = 0; i < predictionsData.length; i += INSERT_CHUNK) {
    const chunk = predictionsData.slice(i, i + INSERT_CHUNK);
    await prisma.prediction.createMany({
      data: chunk,
    });
  }

  return {
    success: true,
    runId: predictionRun.id,
    datasetId,
    totalRecords: batchResult.total,
    predictedAccidents: batchResult.predicted_accidents,
    predictedNoAccidents: batchResult.predicted_no_accidents,
    modelVersion: batchResult.model_version,
  };
}

/**
 * Retrieves company-specific prediction history.
 */
export async function getCompanyPredictionHistory(
  companyId: string,
  options?: { limit?: number; offset?: number; datasetId?: string }
) {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const where: any = { companyId };
  if (options?.datasetId) {
    where.datasetId = options.datasetId;
  }

  const [runs, totalRuns] = await Promise.all([
    prisma.predictionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        dataset: { select: { fileName: true } },
      },
    }),
    prisma.predictionRun.count({ where }),
  ]);

  return { runs, totalRuns };
}

/**
 * Retrieves comprehensive company-specific prediction statistics for dashboards.
 */
export async function getCompanyPredictionSummary(companyId: string) {
  const [
    totalPredictions,
    predictedAccidents,
    predictedNoAccidents,
    criticalSeverity,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    noneSeverity,
    probLow,
    probMed,
    probHigh,
    probCrit,
  ] = await Promise.all([
    prisma.prediction.count({ where: { companyId } }),
    prisma.prediction.count({ where: { companyId, accidentPrediction: true } }),
    prisma.prediction.count({ where: { companyId, accidentPrediction: false } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "CRITICAL" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "HIGH" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "MEDIUM" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "LOW" } }),
    prisma.prediction.count({ where: { companyId, severityPrediction: "NONE" } }),
    prisma.prediction.count({ where: { companyId, riskScore: { lt: 25 } } }),
    prisma.prediction.count({ where: { companyId, riskScore: { gte: 25, lt: 50 } } }),
    prisma.prediction.count({ where: { companyId, riskScore: { gte: 50, lt: 75 } } }),
    prisma.prediction.count({ where: { companyId, riskScore: { gte: 75 } } }),
  ]);

  return {
    totalPredictions,
    predictedAccidents,
    predictedNoAccidents,
    severityBreakdown: {
      critical: criticalSeverity,
      high: highSeverity,
      medium: mediumSeverity,
      low: lowSeverity,
      none: noneSeverity,
    },
    probabilityDistribution: {
      veryLow: probLow,
      moderate: probMed,
      high: probHigh,
      severe: probCrit,
    },
  };
}

