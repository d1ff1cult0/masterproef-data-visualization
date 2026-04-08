"use client";

import { useState, useMemo, useCallback } from "react";
import type { ModelKey, DataPoint } from "@/lib/extreme-events";
import type { SelectedModel } from "@/lib/types";
import {
  computeEnsembleMetrics,
  computeModelMAE,
  type EnsembleResult,
} from "@/lib/analysis";
import { ExportableChart } from "./ExportableChart";

interface Props {
  data: DataPoint[];
  modelKeys: ModelKey[];
  selectedModels: SelectedModel[];
}

function formatV(v: number | null): string {
  if (v === null || isNaN(v)) return "—";
  return v.toFixed(2);
}

export default function EnsembleBuilder({
  data,
  modelKeys,
  selectedModels,
}: Props) {
  const n = modelKeys.length;
  const [weights, setWeights] = useState<number[]>(() =>
    Array(n).fill(1 / Math.max(n, 1))
  );

  // Reset weights when model count changes
  const prevN = weights.length;
  if (prevN !== n) {
    const eq = Array(n).fill(1 / Math.max(n, 1));
    // can't call setWeights in render — schedule for next tick
    setTimeout(() => setWeights(eq), 0);
  }

  const handleSlider = useCallback(
    (idx: number, rawPct: number) => {
      const newVal = rawPct / 100;
      setWeights((prev) => {
        const next = [...prev];
        next[idx] = newVal;
        const othersSum = next.reduce((s, w, i) => (i === idx ? s : s + w), 0);
        const remaining = 1 - newVal;
        if (othersSum > 0) {
          const scale = remaining / othersSum;
          for (let i = 0; i < next.length; i++) {
            if (i !== idx) next[i] *= scale;
          }
        } else {
          // all others are 0 — distribute equally
          const share = remaining / Math.max(next.length - 1, 1);
          for (let i = 0; i < next.length; i++) {
            if (i !== idx) next[i] = share;
          }
        }
        return next;
      });
    },
    []
  );

  const setEqualWeights = useCallback(() => {
    setWeights(Array(n).fill(1 / Math.max(n, 1)));
  }, [n]);

  // individual MAEs for inverse-MAE weighting
  const individualMAEs = useMemo(
    () => modelKeys.map(({ prefix }) => computeModelMAE(data, prefix)),
    [data, modelKeys]
  );

  const setInverseMAE = useCallback(() => {
    const inv = individualMAEs.map((m) => (m > 0 ? 1 / m : 0));
    const total = inv.reduce((a, b) => a + b, 0);
    setWeights(total > 0 ? inv.map((v) => v / total) : Array(n).fill(1 / n));
  }, [individualMAEs, n]);

  // individual model metrics
  const individualMetrics: (EnsembleResult & { label: string; color: string })[] =
    useMemo(
      () =>
        modelKeys.map(({ prefix, label, color }, i) => ({
          label,
          color,
          mae: individualMAEs[i],
          rmse: 0, // compute below
          crps: null,
        })),
      [modelKeys, individualMAEs]
    );

  // compute full individual metrics (RMSE + CRPS)
  const fullIndividual = useMemo(() => {
    return modelKeys.map(({ prefix, label, color }) => {
      const w = Array(modelKeys.length).fill(0);
      const idx = modelKeys.findIndex((m) => m.prefix === prefix);
      if (idx >= 0) w[idx] = 1;
      const r = computeEnsembleMetrics(data, modelKeys, w);
      return { label, color, ...r };
    });
  }, [data, modelKeys]);

  // ensemble metrics (live)
  const ensembleResult = useMemo(
    () => computeEnsembleMetrics(data, modelKeys, weights),
    [data, modelKeys, weights]
  );

  if (n < 2) {
    return (
      <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">
            Ensemble Builder
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-zinc-500">
            Select 2 or more models to use the ensemble builder.
          </p>
        </div>
      </div>
    );
  }

  // find best per metric for highlighting
  const allRows = [...fullIndividual, { label: "Ensemble", color: "#2563eb", ...ensembleResult }];
  const bestMAE = Math.min(...allRows.map((r) => r.mae));
  const bestRMSE = Math.min(...allRows.map((r) => r.rmse));
  const crpsVals = allRows.map((r) => r.crps).filter((v): v is number => v !== null);
  const bestCRPS = crpsVals.length > 0 ? Math.min(...crpsVals) : null;

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">
          Ensemble Builder
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Adjust weights to build a weighted average ensemble. Predictions and
          quantiles are combined with the selected weights.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Preset buttons */}
        <div className="flex gap-2 chart-export-exclude">
          <button
            onClick={setEqualWeights}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            Equal Weight
          </button>
          <button
            onClick={setInverseMAE}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            Inverse MAE
          </button>
        </div>

        {/* Weight sliders */}
        <ExportableChart title="Ensemble Builder" filename="ensemble-builder">
          <div className="space-y-3">
            {modelKeys.map(({ label, color }, i) => (
              <div key={label} className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-zinc-700 w-32 truncate" title={label}>
                  {label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(weights[i] * 100)}
                  onChange={(e) => handleSlider(i, Number(e.target.value))}
                  className="flex-1 h-1.5 accent-blue-600 chart-export-exclude"
                />
                <span className="text-xs tabular-nums text-zinc-600 w-12 text-right">
                  {(weights[i] * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                    Model
                  </th>
                  <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                    Weight
                  </th>
                  <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                    MAE
                  </th>
                  <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                    RMSE
                  </th>
                  <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                    CRPS
                  </th>
                </tr>
              </thead>
              <tbody>
                {fullIndividual.map(({ label, color, mae, rmse, crps }, i) => (
                  <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                    <td className="border border-zinc-200 px-3 py-1.5 text-zinc-700">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: color }}
                        />
                        {label}
                      </span>
                    </td>
                    <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-500">
                      {(weights[i] * 100).toFixed(0)}%
                    </td>
                    <td
                      className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                        mae === bestMAE
                          ? "font-semibold text-emerald-600"
                          : "text-zinc-600"
                      }`}
                    >
                      {formatV(mae)}
                    </td>
                    <td
                      className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                        rmse === bestRMSE
                          ? "font-semibold text-emerald-600"
                          : "text-zinc-600"
                      }`}
                    >
                      {formatV(rmse)}
                    </td>
                    <td
                      className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                        crps !== null && crps === bestCRPS
                          ? "font-semibold text-emerald-600"
                          : "text-zinc-600"
                      }`}
                    >
                      {formatV(crps)}
                    </td>
                  </tr>
                ))}
                {/* Ensemble row */}
                <tr className="bg-blue-50/60 font-medium">
                  <td className="border border-zinc-200 px-3 py-1.5 text-blue-800">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block bg-blue-600" />
                      Ensemble (weighted)
                    </span>
                  </td>
                  <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-blue-600">
                    —
                  </td>
                  <td
                    className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                      ensembleResult.mae === bestMAE
                        ? "font-semibold text-emerald-600"
                        : "text-blue-800"
                    }`}
                  >
                    {formatV(ensembleResult.mae)}
                  </td>
                  <td
                    className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                      ensembleResult.rmse === bestRMSE
                        ? "font-semibold text-emerald-600"
                        : "text-blue-800"
                    }`}
                  >
                    {formatV(ensembleResult.rmse)}
                  </td>
                  <td
                    className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                      ensembleResult.crps !== null && ensembleResult.crps === bestCRPS
                        ? "font-semibold text-emerald-600"
                        : "text-blue-800"
                    }`}
                  >
                    {formatV(ensembleResult.crps)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ExportableChart>
      </div>
    </div>
  );
}
