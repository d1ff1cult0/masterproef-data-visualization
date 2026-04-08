"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { SelectedModel, PredictionResponse, PredictionPoint } from "@/lib/types";
import type { ModelKey, DataPoint } from "@/lib/extreme-events";
import PerHourErrorAnalysis from "./PerHourErrorAnalysis";
import RegimeBreakdown from "./RegimeBreakdown";
import EnsembleBuilder from "./EnsembleBuilder";
import CalibrationPlot from "./CalibrationPlot";

interface Props {
  selectedModels: SelectedModel[];
}

export default function AnalysisView({ selectedModels }: Props) {
  const [predictions, setPredictions] = useState<Map<string, PredictionResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (selectedModels.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const results = new Map<string, PredictionResponse>();
      const fetches = selectedModels.map(async (m) => {
        const key = `${m.experiment}/${m.model}`;
        const params = new URLSearchParams({
          experiment: m.experiment,
          model: m.model,
          run: m.run,
          startDay: "0",
          endDay: "9999",
        });
        const res = await fetch(`/api/predictions?${params}`);
        if (!res.ok) throw new Error(`Failed to fetch predictions for ${key}`);
        const data: PredictionResponse = await res.json();
        results.set(key, data);
      });

      await Promise.all(fetches);
      setPredictions(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, [selectedModels]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  // Build merged dataset (same pattern as PredictionsChart)
  const allData: DataPoint[] = useMemo(() => {
    if (predictions.size === 0) return [];

    const firstPred = predictions.values().next().value;
    if (!firstPred) return [];

    const points: DataPoint[] = firstPred.data.map((p: PredictionPoint) => ({
      index: p.index,
      date: p.date,
      day: p.day,
      hour: p.hour,
      y_test: p.y_test,
    }));

    for (const [key, pred] of predictions) {
      const prefix = key.split("/").pop()?.replace(/_/g, " ") ?? key;
      for (let i = 0; i < pred.data.length && i < points.length; i++) {
        const d = pred.data[i];
        points[i][`${prefix}_mean`] = d.y_pred_mean ?? d["y_pred_mean"] ?? 0;
        for (const qKey of pred.keys) {
          if (qKey.startsWith("q_")) {
            points[i][`${prefix}_${qKey}`] = d[qKey] as number;
          }
        }
      }
    }

    return points;
  }, [predictions]);

  // Build modelKeys
  const modelKeys: ModelKey[] = useMemo(
    () =>
      selectedModels.map((m) => ({
        prefix: m.model.replace(/_/g, " "),
        label: m.model.replace(/_/g, " "),
        color: m.color,
      })),
    [selectedModels]
  );

  if (selectedModels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-zinc-500">
          Select models from the sidebar to view analysis.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading analysis data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PerHourErrorAnalysis data={allData} modelKeys={modelKeys} />
      <RegimeBreakdown data={allData} modelKeys={modelKeys} />
      <EnsembleBuilder
        data={allData}
        modelKeys={modelKeys}
        selectedModels={selectedModels}
      />
      <CalibrationPlot data={allData} modelKeys={modelKeys} />
    </div>
  );
}
