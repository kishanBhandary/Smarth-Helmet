"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Eye,
  Check,
} from "lucide-react";

interface ValidationSummary {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  missingColumns: string[];
  errors: Array<{
    rowNumber: number;
    field: string;
    value: any;
    message: string;
  }>;
  preview: any[];
  headers: string[];
}

export default function DatasetUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
        setError("Only Excel (.xlsx, .xls) and CSV (.csv) files are supported");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setValidationSummary(null);
      setImportResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/datasets/validate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate dataset");
      }

      setValidationSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to validate dataset");
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("runPredictions", "true");

    try {
      const res = await fetch("/api/datasets/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import dataset");
      }

      setImportResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to import dataset");
    } finally {
      setIsImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setValidationSummary(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Upload Company Dataset
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Upload your smart helmet sensor records (.xlsx, .xls, .csv). Validate features and run AI accident and severity predictions.
        </p>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 space-y-6">
        {/* Step 1: Upload or Drop file */}
        {!validationSummary && !importResult && (
          <>
            <div
              className={`flex justify-center rounded-lg border border-dashed border-slate-900/25 px-6 py-16 ${
                isValidating ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div className="text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
                <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx, .xls, .csv"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-slate-500">Excel or CSV files up to 50MB (.xlsx, .xls, .csv)</p>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex items-center">
                  <FileSpreadsheet className="h-6 w-6 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {isValidating ? "Validating Features..." : "Validate & Preview"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start">
            <XCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Upload Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Step 2: Validation Preview & Summary */}
        {validationSummary && !importResult && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Dataset Validation Summary</h3>
                <p className="text-xs text-slate-500">File: {file?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting || validationSummary.validRecords === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  {isImporting ? "Processing & Predicting..." : "Confirm Import & Run AI Predictions"}
                </button>
              </div>
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-slate-500 uppercase">Total Records</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{validationSummary.totalRecords.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="text-xs font-medium text-green-700 uppercase">Valid Records</span>
                <p className="text-2xl font-bold text-green-700 mt-1">{validationSummary.validRecords.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-lg border ${validationSummary.invalidRecords > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                <span className={`text-xs font-medium uppercase ${validationSummary.invalidRecords > 0 ? "text-red-700" : "text-slate-500"}`}>
                  Invalid Records
                </span>
                <p className={`text-2xl font-bold mt-1 ${validationSummary.invalidRecords > 0 ? "text-red-700" : "text-slate-900"}`}>
                  {validationSummary.invalidRecords.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-xs font-medium text-amber-700 uppercase">Duplicates</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">{validationSummary.duplicateRecords.toLocaleString()}</p>
              </div>
            </div>

            {/* Missing columns warning */}
            {validationSummary.missingColumns.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Missing Required Features for AI Models:</p>
                  <p className="mt-1">
                    The following required columns were not detected:{" "}
                    <span className="font-mono font-medium">{validationSummary.missingColumns.join(", ")}</span>.
                  </p>
                  <p className="text-xs mt-1 text-amber-700">
                    Expected columns: Speed, Acceleration, Braking, Sharp_Turn, Tilt_Angle, Weather, Road_Condition.
                  </p>
                </div>
              </div>
            )}

            {/* Error table if invalid records exist */}
            {validationSummary.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    Validation Errors Detected ({validationSummary.invalidRecords} rows affected)
                  </h4>
                  <span className="text-xs text-slate-500">Showing first {validationSummary.errors.length} issues</span>
                </div>
                <div className="border border-red-200 rounded-lg overflow-x-auto max-h-56">
                  <table className="min-w-full divide-y divide-red-200 text-xs">
                    <thead className="bg-red-50 text-red-900 font-medium">
                      <tr>
                        <th className="px-3 py-2 text-left">Excel Row</th>
                        <th className="px-3 py-2 text-left">Field</th>
                        <th className="px-3 py-2 text-left">Value Received</th>
                        <th className="px-3 py-2 text-left">Correction Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 bg-white">
                      {validationSummary.errors.map((err, i) => (
                        <tr key={i} className="hover:bg-red-50/50">
                          <td className="px-3 py-1.5 font-medium text-slate-700">Row {err.rowNumber}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-900">{err.field}</td>
                          <td className="px-3 py-1.5 text-slate-500">{err.value === null || err.value === undefined ? "empty" : String(err.value)}</td>
                          <td className="px-3 py-1.5 text-red-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {validationSummary.preview.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900">Dataset Preview (First 10 Rows)</h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-medium">
                      <tr>
                        <th className="px-3 py-2 text-left">Row</th>
                        <th className="px-3 py-2 text-left">Speed</th>
                        <th className="px-3 py-2 text-left">Accel</th>
                        <th className="px-3 py-2 text-left">Braking</th>
                        <th className="px-3 py-2 text-left">Sharp Turn</th>
                        <th className="px-3 py-2 text-left">Tilt Angle</th>
                        <th className="px-3 py-2 text-left">Weather</th>
                        <th className="px-3 py-2 text-left">Road</th>
                        <th className="px-3 py-2 text-left">Rider ID</th>
                        <th className="px-3 py-2 text-left">Helmet ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {validationSummary.preview.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium text-slate-400">{p.row}</td>
                          <td className="px-3 py-1.5 text-slate-800">{p.Speed ?? "-"}</td>
                          <td className="px-3 py-1.5 text-slate-800">{p.Acceleration ?? "-"}</td>
                          <td className="px-3 py-1.5 text-slate-800">{String(p.Braking ?? "-")}</td>
                          <td className="px-3 py-1.5 text-slate-800">{String(p.Sharp_Turn ?? "-")}</td>
                          <td className="px-3 py-1.5 text-slate-800">{p.Tilt_Angle ?? "-"}</td>
                          <td className="px-3 py-1.5 text-slate-800">{p.Weather ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-800">{p.Road_Condition ?? "-"}</td>
                          <td className="px-3 py-1.5 text-slate-500 font-mono">{p.Rider_ID ?? "-"}</td>
                          <td className="px-3 py-1.5 text-slate-500 font-mono">{p.Helmet_ID ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Success Screen with Prediction Summary */}
        {importResult && (
          <div className="text-center py-8 space-y-6">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">Dataset Imported & Analyzed Successfully</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your sensor telemetry records have been imported and evaluated through the AI ML models.
              </p>
            </div>

            {/* AI Prediction Summary Card */}
            {importResult.predictionSummary ? (
              <div className="max-w-lg mx-auto bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md text-left">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    AI ML Prediction Results
                  </span>
                  <span className="text-xs text-slate-400">
                    Model: {importResult.predictionSummary.modelVersion || "v1.0"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase">Predicted Accidents</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">
                      {importResult.predictionSummary.predictedAccidents}
                    </p>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 uppercase">Safe Telemetry</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {importResult.predictionSummary.predictedNoAccidents}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 text-center">
                  Severity evaluations were executed exclusively on detected accident events.
                </p>
              </div>
            ) : importResult.predictionError ? (
              <div className="max-w-lg mx-auto bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-sm text-left">
                <p className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Dataset Imported, but ML Service is Offline
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Telemetry records are safely stored. Start the ML service (`npm run dev:ml`) and click &quot;Run AI Predictions&quot; in the Datasets list to generate predictions.
                </p>
              </div>
            ) : null}

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push("/dashboard/datasets")}
                className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              >
                View Datasets
              </button>
              <button
                onClick={resetAll}
                className="inline-flex items-center rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
