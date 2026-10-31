import * as xlsx from "xlsx";

export interface RowValidationError {
  rowNumber: number;
  field: string;
  value: any;
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  errors: RowValidationError[];
  preview: any[];
  headers: string[];
  missingColumns: string[];
}

export interface ParsedSensorRow {
  rowIndex: number;
  // Core ML model features
  Speed: number;
  Acceleration: number;
  Braking: "Yes" | "No";
  Sharp_Turn: "Yes" | "No";
  Tilt_Angle: number;
  Weather: string;
  Road_Condition: string;
  // Additional metadata features preserved
  Rider_ID: string;
  Helmet_ID: string;
  Trip_ID: string;
  Timestamp: Date;
  Name?: string;
  Company_ID?: string;
  Company_Name?: string;
  GPS?: string;
  Latitude?: number | null;
  Longitude?: number | null;
  Location?: string;
  Impact?: number | null;
  Accident?: boolean;
  Severity?: string;
}

const REQUIRED_FEATURE_NAMES = [
  "Speed",
  "Acceleration",
  "Braking",
  "Sharp_Turn",
  "Tilt_Angle",
  "Weather",
  "Road_Condition",
];

const ALLOWED_WEATHER = new Set(["Clear", "Cloudy", "Fog", "Rain"]);
const ALLOWED_ROAD_CONDITIONS = new Set(["Dry", "Normal", "Poor", "Pothole", "Wet"]);

/**
 * Normalizes column keys to standard case for flexibility (handles "speed", "Speed", "sharpTurn", etc.)
 */
function normalizeRowKeys(rawRow: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const cleanKey = k.trim();
    const lowerKey = cleanKey.toLowerCase().replace(/[\s_-]/g, "");

    if (lowerKey === "speed") normalized["Speed"] = v;
    else if (lowerKey === "acceleration") normalized["Acceleration"] = v;
    else if (lowerKey === "braking") normalized["Braking"] = v;
    else if (lowerKey === "sharpturn") normalized["Sharp_Turn"] = v;
    else if (lowerKey === "tiltangle") normalized["Tilt_Angle"] = v;
    else if (lowerKey === "weather") normalized["Weather"] = v;
    else if (lowerKey === "roadcondition") normalized["Road_Condition"] = v;
    else if (
      lowerKey === "riderid" ||
      lowerKey === "userid" ||
      lowerKey === "driverid" ||
      lowerKey === "employeeid" ||
      lowerKey === "memberid"
    ) normalized["Rider_ID"] = v;
    else if (
      lowerKey === "helmetid" ||
      lowerKey === "helmet" ||
      lowerKey === "deviceid" ||
      lowerKey === "device"
    ) normalized["Helmet_ID"] = v;
    else if (
      lowerKey === "tripid" ||
      lowerKey === "trip" ||
      lowerKey === "journeyid" ||
      lowerKey === "rideid"
    ) normalized["Trip_ID"] = v;
    else if (lowerKey === "timestamp" || lowerKey === "time" || lowerKey === "date" || lowerKey === "datetime") normalized["Timestamp"] = v;
    else if (
      lowerKey === "name" ||
      lowerKey === "ridername" ||
      lowerKey === "user" ||
      lowerKey === "username" ||
      lowerKey === "rider" ||
      lowerKey === "driver" ||
      lowerKey === "employee" ||
      lowerKey === "drivername" ||
      lowerKey === "employeename" ||
      lowerKey === "fullname" ||
      lowerKey === "person"
    ) normalized["Name"] = v;
    else if (lowerKey === "companyid" || lowerKey === "company") normalized["Company_ID"] = v;
    else if (lowerKey === "companyname") normalized["Company_Name"] = v;
    else if (lowerKey === "gps" || lowerKey === "coordinates") normalized["GPS"] = v;
    else if (lowerKey === "location" || lowerKey === "address" || lowerKey === "city" || lowerKey === "area") normalized["Location"] = v;
    else if (lowerKey === "impact" || lowerKey === "impactforce") normalized["Impact"] = v;
    else if (lowerKey === "accident" || lowerKey === "isaccident") normalized["Accident"] = v;
    else if (lowerKey === "severity" || lowerKey === "severitylevel") normalized["Severity"] = v;
    else normalized[cleanKey] = v;
  }
  return normalized;
}

/**
 * Parses buffer from Excel or CSV file.
 */
export function parseSpreadsheetBuffer(buffer: Buffer | ArrayBuffer): any[] {
  const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const workbook = xlsx.read(nodeBuf, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

/**
 * Validates the raw uploaded rows against required model features and schemas.
 */
export function validateDatasetRows(rawRows: any[]): {
  summary: ValidationSummary;
  validRows: ParsedSensorRow[];
} {
  if (!rawRows || rawRows.length === 0) {
    return {
      summary: {
        isValid: false,
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        duplicateRecords: 0,
        errors: [{ rowNumber: 0, field: "file", value: null, message: "Dataset is empty" }],
        preview: [],
        headers: [],
        missingColumns: REQUIRED_FEATURE_NAMES,
      },
      validRows: [],
    };
  }

  const sampleRow = normalizeRowKeys(rawRows[0]);
  const headers = Object.keys(sampleRow);
  const missingColumns = REQUIRED_FEATURE_NAMES.filter((req) => !(req in sampleRow));

  const errors: RowValidationError[] = [];
  const validRows: ParsedSensorRow[] = [];
  const seenFingerprints = new Set<string>();
  let duplicateRecords = 0;

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // 1-indexed Excel row (row 1 is header)
    const norm = normalizeRowKeys(row);
    let rowHasError = false;

    // 1. Missing required features check
    for (const req of REQUIRED_FEATURE_NAMES) {
      if (norm[req] === undefined || norm[req] === null || norm[req] === "") {
        errors.push({
          rowNumber,
          field: req,
          value: norm[req],
          message: `Missing required field "${req}"`,
        });
        rowHasError = true;
      }
    }

    // 2. Numeric validations
    const speed = parseFloat(norm["Speed"]);
    if (isNaN(speed) || speed < 0 || speed > 300) {
      errors.push({
        rowNumber,
        field: "Speed",
        value: norm["Speed"],
        message: "Speed must be a valid number between 0 and 300 km/h",
      });
      rowHasError = true;
    }

    const accel = parseFloat(norm["Acceleration"]);
    if (isNaN(accel)) {
      errors.push({
        rowNumber,
        field: "Acceleration",
        value: norm["Acceleration"],
        message: "Acceleration must be a numeric value",
      });
      rowHasError = true;
    }

    const tilt = parseFloat(norm["Tilt_Angle"]);
    if (isNaN(tilt) || tilt < -180 || tilt > 180) {
      errors.push({
        rowNumber,
        field: "Tilt_Angle",
        value: norm["Tilt_Angle"],
        message: "Tilt_Angle must be a number between -180 and 180 degrees",
      });
      rowHasError = true;
    }

    // 3. Braking validation (Yes/No)
    let braking: "Yes" | "No" = "No";
    const brkStr = String(norm["Braking"] || "").trim().toLowerCase();
    if (["yes", "true", "1", "harsh"].includes(brkStr)) {
      braking = "Yes";
    } else if (["no", "false", "0", "normal"].includes(brkStr)) {
      braking = "No";
    } else if (norm["Braking"] !== undefined && norm["Braking"] !== null) {
      errors.push({
        rowNumber,
        field: "Braking",
        value: norm["Braking"],
        message: "Braking must be 'Yes' or 'No'",
      });
      rowHasError = true;
    }

    // 4. Sharp_Turn validation (Yes/No)
    let sharpTurn: "Yes" | "No" = "No";
    const stStr = String(norm["Sharp_Turn"] || "").trim().toLowerCase();
    if (["yes", "true", "1"].includes(stStr)) {
      sharpTurn = "Yes";
    } else if (["no", "false", "0"].includes(stStr)) {
      sharpTurn = "No";
    } else if (norm["Sharp_Turn"] !== undefined && norm["Sharp_Turn"] !== null) {
      errors.push({
        rowNumber,
        field: "Sharp_Turn",
        value: norm["Sharp_Turn"],
        message: "Sharp_Turn must be 'Yes' or 'No'",
      });
      rowHasError = true;
    }

    // 5. Categorical Weather validation
    const weather = String(norm["Weather"] || "").trim();
    const weatherTitle = weather.charAt(0).toUpperCase() + weather.slice(1).toLowerCase();
    if (!ALLOWED_WEATHER.has(weatherTitle)) {
      errors.push({
        rowNumber,
        field: "Weather",
        value: norm["Weather"],
        message: `Weather must be one of: ${Array.from(ALLOWED_WEATHER).join(", ")}`,
      });
      rowHasError = true;
    }

    // 6. Categorical Road_Condition validation
    const road = String(norm["Road_Condition"] || "").trim();
    const roadTitle = road.charAt(0).toUpperCase() + road.slice(1).toLowerCase();
    if (!ALLOWED_ROAD_CONDITIONS.has(roadTitle)) {
      errors.push({
        rowNumber,
        field: "Road_Condition",
        value: norm["Road_Condition"],
        message: `Road_Condition must be one of: ${Array.from(ALLOWED_ROAD_CONDITIONS).join(", ")}`,
      });
      rowHasError = true;
    }

    // 7. Timestamp validation
    let timestamp = new Date();
    if (norm["Timestamp"] instanceof Date) {
      timestamp = norm["Timestamp"];
    } else if (typeof norm["Timestamp"] === "number") {
      timestamp = new Date(Math.round((norm["Timestamp"] - 25569) * 86400 * 1000));
    } else if (typeof norm["Timestamp"] === "string" && norm["Timestamp"].trim()) {
      timestamp = new Date(norm["Timestamp"]);
    }
    if (isNaN(timestamp.getTime())) {
      errors.push({
        rowNumber,
        field: "Timestamp",
        value: norm["Timestamp"],
        message: "Invalid or unrecognized timestamp format",
      });
      rowHasError = true;
    }

    // 8. Duplicate row detection and entity identifier resolution
    const rawName = norm["Name"] ? String(norm["Name"]).trim() : undefined;
    const rawRiderId = norm["Rider_ID"] ? String(norm["Rider_ID"]).trim() : undefined;

    // Use actual name if provided; if Rider_ID is missing use sanitized name or generate ID
    const riderId = rawRiderId || (rawName ? rawName.replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase() : `RIDER-${idx + 1}`);
    const name = rawName || (rawRiderId ? (rawRiderId.startsWith("RIDER-") ? `Rider ${rawRiderId.replace("RIDER-", "")}` : rawRiderId) : `Rider ${idx + 1}`);

    const helmetId = String(norm["Helmet_ID"] || `HELMET-${idx + 1}`).trim();
    const tripId = String(norm["Trip_ID"] || `TRIP-${idx + 1}`).trim();
    const fingerprint = `${riderId}_${helmetId}_${tripId}_${timestamp.getTime()}_${speed}`;
    if (seenFingerprints.has(fingerprint)) {
      duplicateRecords++;
    } else {
      seenFingerprints.add(fingerprint);
    }

    // Parse GPS if available
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (norm["GPS"]) {
      const parts = String(norm["GPS"]).split(",");
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lon = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lon)) {
          latitude = lat;
          longitude = lon;
        }
      }
    }

    if (!rowHasError) {
      validRows.push({
        rowIndex: idx,
        Speed: speed,
        Acceleration: accel,
        Braking: braking,
        Sharp_Turn: sharpTurn,
        Tilt_Angle: tilt,
        Weather: weatherTitle,
        Road_Condition: roadTitle,
        Rider_ID: riderId,
        Helmet_ID: helmetId,
        Trip_ID: tripId,
        Timestamp: timestamp,
        Name: name,
        Company_ID: norm["Company_ID"] ? String(norm["Company_ID"]) : undefined,
        Company_Name: norm["Company_Name"] ? String(norm["Company_Name"]) : undefined,
        GPS: norm["GPS"] ? String(norm["GPS"]) : undefined,
        Latitude: latitude,
        Longitude: longitude,
        Location: norm["Location"] ? String(norm["Location"]) : undefined,
        Impact: norm["Impact"] ? parseFloat(norm["Impact"]) : null,
        Accident:
          norm["Accident"] === true ||
          String(norm["Accident"]).toLowerCase() === "yes" ||
          String(norm["Accident"]).toLowerCase() === "true",
        Severity: norm["Severity"] ? String(norm["Severity"]).toUpperCase() : "NONE",
      });
    }
  });

  const preview = rawRows.slice(0, 10).map((r, i) => ({
    row: i + 2,
    ...normalizeRowKeys(r),
  }));

  return {
    summary: {
      isValid: errors.length === 0 && missingColumns.length === 0,
      totalRecords: rawRows.length,
      validRecords: validRows.length,
      invalidRecords: rawRows.length - validRows.length,
      duplicateRecords,
      errors: errors.slice(0, 50), // Send first 50 errors to UI
      preview,
      headers,
      missingColumns,
    },
    validRows,
  };
}

