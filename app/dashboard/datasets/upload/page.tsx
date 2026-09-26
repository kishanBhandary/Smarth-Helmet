"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, XCircle, CheckCircle } from "lucide-react";

export default function DatasetUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
        setError("Only .xlsx and .xls files are supported");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(10); // Fake initial progress

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const res = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload dataset");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Upload Dataset
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Upload your smart helmet Excel dataset to process and analyze rider data.
        </p>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
        {!result ? (
          <>
            <div
              className={`mt-2 flex justify-center rounded-lg border border-dashed border-slate-900/25 px-6 py-20 ${
                isUploading ? "opacity-50 pointer-events-none" : ""
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
                      accept=".xlsx, .xls"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-slate-500">Excel files up to 50MB (.xlsx, .xls)</p>
              </div>
            </div>

            {file && (
              <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex items-center">
                  <FileSpreadsheet className="h-6 w-6 text-slate-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {isUploading ? "Processing..." : "Start Upload"}
                </button>
              </div>
            )}

            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Uploading and Validating...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-slate-900 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start">
                <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">Dataset Processed Successfully</h3>
            
            <div className="max-w-md mx-auto mt-6 bg-slate-50 p-6 rounded-lg border border-slate-200 text-left">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">DATASET VALIDATION</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Records</span>
                  <span className="font-medium text-slate-900">{result.totalRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valid Records</span>
                  <span className="font-medium text-green-600">{result.validRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invalid Records</span>
                  <span className="font-medium text-red-600">{result.invalidRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duplicate Records</span>
                  <span className="font-medium text-amber-600">{result.duplicateRecords}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-x-4">
              <button
                onClick={() => router.push("/dashboard/datasets")}
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              >
                View Datasets
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
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
