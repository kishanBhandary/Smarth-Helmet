"use client";

import { useState } from "react";
import { Play, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DatasetRowActions({
  datasetId,
  predictionsCount,
  recordsCount = 0,
  status = "PROCESSED",
}: {
  datasetId: string;
  predictionsCount: number;
  recordsCount?: number;
  status?: string;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPredictDisabled = isRunning || isDeleting || recordsCount === 0 || status === "PROCESSING";

  const handleRun = async () => {
    if (recordsCount === 0) {
      setError("No sensor records in dataset.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResultMsg(null);

    try {
      const res = await fetch("/api/predictions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute predictions");
      }

      setResultMsg(`Done: ${data.result.predictedAccidents} accidents predicted.`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this dataset? All its records and predictions will be removed.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/datasets/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete dataset");
      }

      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleRun}
          disabled={isPredictDisabled}
          title={recordsCount === 0 ? "Dataset has no sensor records to evaluate" : "Run AI ML model on this dataset"}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-fit"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              {predictionsCount > 0 ? "Re-run AI" : "Run AI Predictions"}
            </>
          )}
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting || isRunning}
          title="Delete dataset"
          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {recordsCount === 0 && (
        <span className="text-[10px] text-amber-600 font-medium">0 records imported</span>
      )}
      {resultMsg && (
        <span className="text-[11px] text-emerald-600 font-medium">{resultMsg}</span>
      )}
      {error && (
        <span className="text-[11px] text-red-500 truncate max-w-[180px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
