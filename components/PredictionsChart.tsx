"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from "recharts";
import type { SelectedModel, PredictionResponse, PredictionPoint } from "@/lib/types";

interface PredictionsChartProps {
  selectedModels: SelectedModel[];
}

interface MergedPoint {
  index: number;
  date: string;
  day: number;
  hour: number;
  y_test: number;
  [key: string]: number | string | [number, number];
}

const QUANTILE_BANDS = [
  { lower: "q_0.025", upper: "q_0.975", label: "95% CI", opacity: 0.08 },
  { lower: "q_0.1", upper: "q_0.9", label: "80% CI", opacity: 0.12 },
  { lower: "q_0.25", upper: "q_0.75", label: "50% CI", opacity: 0.18 },
];

export default function PredictionsChart({ selectedModels }: PredictionsChartProps) {
  const [predictions, setPredictions] = useState<Map<string, PredictionResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuantiles, setShowQuantiles] = useState(true);

  const [zoomLeft, setZoomLeft] = useState<string | null>(null);
  const [zoomRight, setZoomRight] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const [viewStart, setViewStart] = useState<number | null>(null);
  const [viewEnd, setViewEnd] = useState<number | null>(null);

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
      setViewStart(null);
      setViewEnd(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, [selectedModels]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const allData = useMemo(() => {
    if (predictions.size === 0) return [];

    const firstPred = predictions.values().next().value;
    if (!firstPred) return [];

    const points: MergedPoint[] = firstPred.data.map((p: PredictionPoint) => ({
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
        for (const band of QUANTILE_BANDS) {
          const lo = Number(d[band.lower]) || 0;
          const hi = Number(d[band.upper]) || 0;
          points[i][`${prefix}_band_${band.label}`] = [lo, hi];
        }
      }
    }

    return points;
  }, [predictions]);

  const viewData = useMemo(() => {
    if (viewStart === null || viewEnd === null) return allData;
    return allData.slice(viewStart, viewEnd + 1);
  }, [allData, viewStart, viewEnd]);

  const isZoomed = viewStart !== null && viewEnd !== null;

  const modelKeys = useMemo(() => {
    return selectedModels.map((m) => ({
      prefix: m.model.replace(/_/g, " "),
      color: m.color,
      label: m.model.replace(/_/g, " "),
    }));
  }, [selectedModels]);

  const formatXTick = (value: string) => {
    if (!value) return "";
    const parts = value.split(" ");
    if (parts.length >= 2) {
      return parts[0].substring(5);
    }
    return value;
  };

  const handleMouseDown = (e: { activeLabel?: string }) => {
    if (e?.activeLabel) {
      setSelecting(true);
      setZoomLeft(e.activeLabel);
      setZoomRight(null);
    }
  };

  const handleMouseMove = (e: { activeLabel?: string }) => {
    if (selecting && e?.activeLabel) {
      setZoomRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (!selecting || !zoomLeft || !zoomRight) {
      setSelecting(false);
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }

    setSelecting(false);

    const sourceData = isZoomed ? viewData : allData;
    let leftIdx = sourceData.findIndex((p) => p.date === zoomLeft);
    let rightIdx = sourceData.findIndex((p) => p.date === zoomRight);

    if (leftIdx === -1 || rightIdx === -1) {
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }

    if (leftIdx > rightIdx) [leftIdx, rightIdx] = [rightIdx, leftIdx];

    if (rightIdx - leftIdx < 12) {
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }

    const globalLeftIdx = isZoomed ? (viewStart! + leftIdx) : leftIdx;
    const globalRightIdx = isZoomed ? (viewStart! + rightIdx) : rightIdx;

    setViewStart(globalLeftIdx);
    setViewEnd(globalRightIdx);
    setZoomLeft(null);
    setZoomRight(null);
  };

  const resetZoom = () => {
    setViewStart(null);
    setViewEnd(null);
    setZoomLeft(null);
    setZoomRight(null);
  };

  const overviewTickInterval = Math.max(1, Math.floor(allData.length / 8));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Predictions vs Actual Prices
        </h2>
        <div className="flex items-center gap-4">
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
              Reset zoom
            </button>
          )}
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showQuantiles}
              onChange={(e) => setShowQuantiles(e.target.checked)}
              className="rounded border-zinc-300 text-blue-600 h-3 w-3"
            />
            Show confidence intervals
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 border border-zinc-200 rounded-lg">
          <div className="text-sm text-zinc-500">Loading predictions...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-96 border border-red-200 rounded-lg bg-red-50">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      ) : allData.length === 0 ? (
        <div className="flex items-center justify-center h-96 border border-zinc-200 rounded-lg">
          <div className="text-sm text-zinc-500">No prediction data available</div>
        </div>
      ) : (
        <>
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <div className="text-xs text-zinc-400 mb-2">
              {isZoomed
                ? `Zoomed: ${viewData[0]?.date ?? ""} to ${viewData[viewData.length - 1]?.date ?? ""} (${viewData.length} points) — drag to zoom further, or reset`
                : "Drag on the chart to zoom into a region"}
            </div>
            <ResponsiveContainer width="100%" height={460}>
              <ComposedChart
                data={viewData}
                margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                onMouseDown={handleMouseDown as any}
                onMouseMove={handleMouseMove as any}
                onMouseUp={handleMouseUp}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#71717a" }}
                  tickFormatter={formatXTick}
                  interval="preserveStartEnd"
                  stroke="#d4d4d8"
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  stroke="#d4d4d8"
                  label={{
                    value: "Price (EUR/MWh)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 10, fill: "#a1a1aa" },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 6,
                  }}
                  labelFormatter={(label) => String(label)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />

                {showQuantiles &&
                  modelKeys.map(({ prefix, color }) =>
                    QUANTILE_BANDS.map((band) => {
                      const bandKey = `${prefix}_band_${band.label}`;
                      if (viewData.length > 0 && bandKey in viewData[0]) {
                        return (
                          <Area
                            key={bandKey}
                            dataKey={bandKey}
                            stroke="none"
                            fill={color}
                            fillOpacity={band.opacity}
                            name={`${prefix} ${band.label}`}
                            legendType="none"
                            isAnimationActive={false}
                            type="monotone"
                          />
                        );
                      }
                      return null;
                    })
                  )}

                <Line
                  dataKey="y_test"
                  stroke="#6b7280"
                  strokeWidth={1.2}
                  dot={false}
                  name="Actual Price"
                  isAnimationActive={false}
                />

                {modelKeys.map(({ prefix, color, label }) => (
                  <Line
                    key={prefix}
                    dataKey={`${prefix}_mean`}
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    name={label}
                    isAnimationActive={false}
                  />
                ))}

                {zoomLeft && zoomRight && (
                  <ReferenceArea
                    x1={zoomLeft}
                    x2={zoomRight}
                    strokeOpacity={0.3}
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {isZoomed && (
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">Full time series overview — click to reset zoom</span>
              </div>
              <div className="cursor-pointer" onClick={resetZoom}>
                <ResponsiveContainer width="100%" height={100}>
                  <ComposedChart data={allData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 8, fill: "#a1a1aa" }}
                      tickFormatter={formatXTick}
                      interval={overviewTickInterval}
                      stroke="#e4e4e7"
                    />
                    <YAxis hide />

                    <Line
                      dataKey="y_test"
                      stroke="#d4d4d8"
                      strokeWidth={0.8}
                      dot={false}
                      isAnimationActive={false}
                    />

                    {modelKeys.map(({ prefix, color }) => (
                      <Line
                        key={prefix}
                        dataKey={`${prefix}_mean`}
                        stroke={color}
                        strokeWidth={0.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}

                    <ReferenceArea
                      x1={allData[viewStart!]?.date}
                      x2={allData[viewEnd!]?.date}
                      fill="#3b82f6"
                      fillOpacity={0.12}
                      stroke="#3b82f6"
                      strokeOpacity={0.3}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="text-xs text-zinc-400 text-center">
            {allData.length} hourly data points ({Math.ceil(allData.length / 24)} days total)
          </div>
        </>
      )}
    </div>
  );
}
