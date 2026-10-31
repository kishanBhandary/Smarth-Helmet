"use client";

import { useState } from "react";
import { Play, Check, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DatasetRowActions({
  datasetId,
  predictionsCount,
}: {
  datasetId: string;
  predictionsCount: number;
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
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

      setResultMsg(`Predicted: ${data.result.predictedAccidents} accidents / ${data.result.totalRecords} records`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors w-fit"
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

      {resultMsg && (
        <span className="text-[11px] text-emerald-600 font-medium">{resultMsg}</span>
      )}
      {error && (
        <span className="text-[11px] text-red-500 truncate max-w-[150px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

