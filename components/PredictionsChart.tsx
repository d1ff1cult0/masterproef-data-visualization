"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Legend,
} from "recharts";
import type { SelectedModel, PredictionResponse, PredictionPoint } from "@/lib/types";
import { computeExtremeEventStats } from "@/lib/extreme-events";
import ExtremeEventStatsCard from "./ExtremeEventStatsCard";

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

const DURATION_OPTIONS = [
  { label: "1w", days: 7 },
  { label: "2w", days: 14 },
  { label: "1m", days: 30 },
  { label: "2m", days: 60 },
  { label: "3m", days: 90 },
  { label: "6m", days: 182 },
  { label: "All", days: -1 },
];

const TEST_START_DATE = new Date("2025-08-08T00:00:00Z");

function dayToDate(day: number): string {
  const d = new Date(TEST_START_DATE);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().split("T")[0];
}

function dateToDay(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00Z");
  const diff = d.getTime() - TEST_START_DATE.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function PredictionsChart({ selectedModels }: PredictionsChartProps) {
  const [predictions, setPredictions] = useState<Map<string, PredictionResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [showQuantiles, setShowQuantiles] = useState(true);

  const [startDate, setStartDate] = useState(dayToDate(0));
  const [duration, setDuration] = useState(-1);

  // Drag-to-zoom state (operates within the slider window)
  const [zoomLeft, setZoomLeft] = useState<string | null>(null);
  const [zoomRight, setZoomRight] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [zoomStartIdx, setZoomStartIdx] = useState<number | null>(null);
  const [zoomEndIdx, setZoomEndIdx] = useState<number | null>(null);

  // Y-axis: null = auto from visible data; { min, max } = manual
  const [priceYDomain, setPriceYDomain] = useState<{ min: number; max: number } | null>(null);
  const [residualYDomain, setResidualYDomain] = useState<{ min: number; max: number } | null>(null);

  const startDay = Math.max(0, dateToDay(startDate));
  const effectiveDuration = duration === -1 ? (totalDays || 9999) : duration;
  const endDay = Math.min(totalDays || 9999, startDay + effectiveDuration);

  const minDate = dayToDate(0);
  const maxDate = totalDays > 0 ? dayToDate(totalDays) : dayToDate(180);
  const endDate = dayToDate(endDay);
  const sliderMax = totalDays > 0 ? totalDays : 180;

  // Fetch ALL data once
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
        if (data.totalDays > 0) setTotalDays(data.totalDays);
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

  // Build full merged dataset once
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

  // Slice by slider controls (client-side, no re-fetch)
  const sliderData = useMemo(() => {
    if (allData.length === 0) return [];
    const startIdx = startDay * 24;
    const endIdx = endDay * 24;
    return allData.slice(
      Math.max(0, startIdx),
      Math.min(allData.length, endIdx)
    );
  }, [allData, startDay, endDay]);

  // Further slice by drag-to-zoom (within the slider window)
  const viewData = useMemo(() => {
    if (zoomStartIdx !== null && zoomEndIdx !== null) {
      return sliderData.slice(zoomStartIdx, zoomEndIdx + 1);
    }
    return sliderData;
  }, [sliderData, zoomStartIdx, zoomEndIdx]);

  const isZoomed = zoomStartIdx !== null && zoomEndIdx !== null;

  // Clear zoom when slider changes
  useEffect(() => {
    setZoomStartIdx(null);
    setZoomEndIdx(null);
  }, [startDay, endDay]);

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

  // When zoomed in enough that a day spans multiple grid lines, align grid to midnight (00:00)
  // so 24-hour prediction periods are easy to see. Use when showing ≤14 days of hourly data.
  const midnightTicks = useMemo(() => {
    if (viewData.length === 0 || viewData.length > 24 * 14) return undefined;
    const ticks = viewData.filter((p) => p.hour === 0).map((p) => p.date);
    return ticks.length >= 2 ? ticks : undefined;
  }, [viewData]);

  // Auto Y extent from visible data (used when domain is null, and to pre-fill manual mode)
  const priceYExtent = useMemo(() => {
    if (viewData.length === 0 || modelKeys.length === 0) return undefined;
    let min = Infinity;
    let max = -Infinity;
    for (const p of viewData) {
      const vals: number[] = [Number(p.y_test) ?? 0];
      for (const { prefix } of modelKeys) {
        vals.push(Number(p[`${prefix}_mean`]) ?? 0);
        for (const band of QUANTILE_BANDS) {
          const b = p[`${prefix}_band_${band.label}`];
          if (Array.isArray(b)) vals.push(Number(b[0]) ?? 0, Number(b[1]) ?? 0);
        }
      }
      for (const v of vals) {
        if (!Number.isNaN(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    }
    if (min > max) return undefined;
    const pad = (max - min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }, [viewData, modelKeys]);

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

    const sourceData = isZoomed ? viewData : sliderData;
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

    // Convert to indices relative to sliderData
    const baseOffset = isZoomed ? zoomStartIdx! : 0;
    setZoomStartIdx(baseOffset + leftIdx);
    setZoomEndIdx(baseOffset + rightIdx);
    setZoomLeft(null);
    setZoomRight(null);
  };

  const resetZoom = () => {
    setZoomStartIdx(null);
    setZoomEndIdx(null);
    setZoomLeft(null);
    setZoomRight(null);
  };

  // Compute metrics for visible data
  const viewMetrics = useMemo(() => {
    if (viewData.length === 0 || modelKeys.length === 0) return [];

    return modelKeys.map(({ prefix, color, label }) => {
      const meanKey = `${prefix}_mean`;
      const qLowerKey = `${prefix}_q_0.025`;
      const qUpperKey = `${prefix}_q_0.975`;
      const q10Key = `${prefix}_q_0.1`;
      const q25Key = `${prefix}_q_0.25`;
      const q75Key = `${prefix}_q_0.75`;
      const q90Key = `${prefix}_q_0.9`;

      let sumAE = 0, sumSE = 0, sumMPIW = 0, sumIS = 0, sumCRPS = 0;
      let countMPIW = 0, countIS = 0, countCRPS = 0;
      let n = 0;

      for (const p of viewData) {
        const actual = p.y_test as number;
        const pred = Number(p[meanKey]) || 0;
        if (actual == null || pred == null) continue;

        const ae = Math.abs(actual - pred);
        sumAE += ae;
        sumSE += ae * ae;
        n++;

        const lo95 = Number(p[qLowerKey]);
        const hi95 = Number(p[qUpperKey]);
        if (!isNaN(lo95) && !isNaN(hi95) && lo95 !== 0 && hi95 !== 0) {
          const width = hi95 - lo95;
          sumMPIW += width;
          countMPIW++;

          const alpha = 0.05;
          let is = width;
          if (actual < lo95) is += (2 / alpha) * (lo95 - actual);
          if (actual > hi95) is += (2 / alpha) * (actual - hi95);
          sumIS += is;
          countIS++;
        }

        const quantiles: [number, number][] = [];
        const tryQ = (key: string, tau: number) => {
          const v = Number(p[key]);
          if (!isNaN(v) && v !== 0) quantiles.push([tau, v]);
        };
        tryQ(qLowerKey, 0.025);
        tryQ(q10Key, 0.1);
        tryQ(q25Key, 0.25);
        tryQ(`${prefix}_q_0.5`, 0.5);
        tryQ(q75Key, 0.75);
        tryQ(q90Key, 0.9);
        tryQ(qUpperKey, 0.975);

        if (quantiles.length >= 2) {
          let pinballSum = 0;
          for (const [tau, qv] of quantiles) {
            pinballSum += actual >= qv ? tau * (actual - qv) : (1 - tau) * (qv - actual);
          }
          sumCRPS += pinballSum / quantiles.length;
          countCRPS++;
        }
      }

      if (n === 0) return null;

      return {
        label,
        color,
        mae: sumAE / n,
        rmse: Math.sqrt(sumSE / n),
        mpiw: countMPIW > 0 ? sumMPIW / countMPIW : null,
        intervalScore: countIS > 0 ? sumIS / countIS : null,
        crps: countCRPS > 0 ? sumCRPS / countCRPS : null,
      };
    }).filter(Boolean) as {
      label: string; color: string;
      mae: number; rmse: number;
      mpiw: number | null; intervalScore: number | null; crps: number | null;
    }[];
  }, [viewData, modelKeys]);

  // Residuals: actual - predicted (positive = underpredicting, negative = overpredicting)
  const residualsData = useMemo(() => {
    return viewData.map((p) => {
      const pt: Record<string, number | string> = {
        date: p.date,
        index: p.index,
      };
      for (const { prefix } of modelKeys) {
        const actual = p.y_test as number;
        const pred = Number(p[`${prefix}_mean`]) ?? 0;
        pt[`${prefix}_residual`] = actual != null && !Number.isNaN(actual) ? actual - pred : 0;
      }
      return pt;
    });
  }, [viewData, modelKeys]);

  const residualYExtent = useMemo(() => {
    if (residualsData.length === 0 || modelKeys.length === 0) return undefined;
    let min = Infinity;
    let max = -Infinity;
    for (const p of residualsData) {
      for (const { prefix } of modelKeys) {
        const v = Number(p[`${prefix}_residual`]) ?? 0;
        if (!Number.isNaN(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    }
    if (min > max) return undefined;
    const pad = (max - min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }, [residualsData, modelKeys]);

  // Histogram for residual distribution (tail behaviour)
  const RESIDUAL_BINS = 20;
  const histogramData = useMemo(() => {
    if (residualsData.length === 0 || modelKeys.length === 0) return [];
    const allResiduals = residualsData.flatMap((p) =>
      modelKeys.map(({ prefix }) => Number(p[`${prefix}_residual`]) ?? 0)
    ).filter((v) => !Number.isNaN(v));
    if (allResiduals.length === 0) return [];
    const min = Math.min(...allResiduals);
    const max = Math.max(...allResiduals);
    const range = Math.max(max - min, 1);
    const binWidth = range / RESIDUAL_BINS;

    const bins: Record<string, number | string>[] = [];
    for (let i = 0; i < RESIDUAL_BINS; i++) {
      const binCenter = min + (i + 0.5) * binWidth;
      const row: Record<string, number | string> = {
        bin: `${binCenter.toFixed(0)}`,
        binCenter,
      };
      for (const { prefix } of modelKeys) {
        let count = 0;
        for (const p of residualsData) {
          const r = Number(p[`${prefix}_residual`]) ?? 0;
          if (Number.isNaN(r)) continue;
          const binIdx = Math.min(Math.floor((r - min) / binWidth), RESIDUAL_BINS - 1);
          if (binIdx === i && binIdx >= 0) count++;
        }
        row[`${prefix}_count`] = count;
      }
      bins.push(row);
    }
    return bins;
  }, [residualsData, modelKeys]);

  const residualMeans = useMemo(() => {
    return modelKeys.map(({ prefix, label, color }) => {
      const sum = residualsData.reduce((s, p) => s + (Number(p[`${prefix}_residual`]) ?? 0), 0);
      const mean = residualsData.length > 0 ? sum / residualsData.length : 0;
      return { label, color, mean };
    });
  }, [residualsData, modelKeys]);

  const extremeEventStats = useMemo(() => {
    if (viewData.length === 0 || modelKeys.length === 0) return null;
    const modelKeysForExtreme = modelKeys.map((m) => ({ prefix: m.prefix, label: m.label, color: m.color }));
    const overallMaes = Object.fromEntries(viewMetrics.map((m) => [m.label, m.mae]));
    return computeExtremeEventStats(viewData, modelKeysForExtreme, overallMaes);
  }, [viewData, modelKeys, viewMetrics]);

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

      {/* Navigation controls */}
      <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="text-xs px-2.5 py-1.5 rounded border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500">Duration</label>
            <div className="flex items-center gap-1">
              {DURATION_OPTIONS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setDuration(days)}
                  className={`text-xs px-2.5 py-1.5 rounded border transition-colors font-medium ${
                    duration === days
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-zinc-400 ml-auto self-center">
            {duration === -1
              ? `${minDate} to ${maxDate} (all data)`
              : `${startDate} to ${endDate} (${duration} days)`}
          </span>
        </div>

        {duration !== -1 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Navigate start date</label>
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-x-0 h-1 bg-zinc-200 rounded-full" />
              <div
                className="absolute h-1 bg-blue-400 rounded-full"
                style={{
                  left: `${(startDay / sliderMax) * 100}%`,
                  width: `${(Math.min(duration, sliderMax - startDay) / sliderMax) * 100}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={Math.max(0, sliderMax - duration)}
                value={startDay}
                onChange={(e) => setStartDate(dayToDate(parseInt(e.target.value)))}
                className="absolute inset-x-0 w-full appearance-none bg-transparent z-10"
                style={{ background: "transparent" }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{minDate}</span>
              <span>{maxDate}</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 border border-zinc-200 rounded-lg">
          <div className="text-sm text-zinc-500">Loading predictions...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-96 border border-red-200 rounded-lg bg-red-50">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      ) : sliderData.length === 0 ? (
        <div className="flex items-center justify-center h-96 border border-zinc-200 rounded-lg">
          <div className="text-sm text-zinc-500">No prediction data available</div>
        </div>
      ) : (
        <>
          {/* Main chart */}
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <div className="text-xs text-zinc-400 mb-2 flex flex-wrap items-center justify-between gap-2">
              <span>
                {isZoomed
                  ? `Zoomed: ${viewData[0]?.date ?? ""} to ${viewData[viewData.length - 1]?.date ?? ""} (${viewData.length} points) — drag to zoom further, or reset`
                  : "Drag on the chart to zoom into a region"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-500">Y scale:</span>
                {priceYDomain == null ? (
                  <>
                    <span className="text-zinc-400">Auto</span>
                    <button
                      type="button"
                      onClick={() =>
                        priceYExtent &&
                        setPriceYDomain({ min: priceYExtent.min, max: priceYExtent.max })
                      }
                      disabled={!priceYExtent}
                      className="text-xs px-2 py-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    >
                      Set manual
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={priceYDomain.min}
                      onChange={(e) =>
                        setPriceYDomain((d) =>
                          d ? { ...d, min: Number(e.target.value) || 0 } : null
                        )
                      }
                      step="any"
                      className="w-16 text-xs px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700"
                    />
                    <span className="text-zinc-400">to</span>
                    <input
                      type="number"
                      value={priceYDomain.max}
                      onChange={(e) =>
                        setPriceYDomain((d) =>
                          d ? { ...d, max: Number(e.target.value) || 0 } : null
                        )
                      }
                      step="any"
                      className="w-16 text-xs px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPriceYDomain(null)}
                      className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      Auto
                    </button>
                  </>
                )}
              </div>
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
                  ticks={midnightTicks}
                  stroke="#d4d4d8"
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={priceYDomain ? [priceYDomain.min, priceYDomain.max] : undefined}
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

          {/* Residuals: time series (bias + tail behaviour) */}
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-zinc-700">
                Residuals (Actual − Predicted)
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-500 text-xs">Y scale:</span>
                {residualYDomain == null ? (
                  <>
                    <span className="text-zinc-400 text-xs">Auto</span>
                    <button
                      type="button"
                      onClick={() =>
                        residualYExtent &&
                        setResidualYDomain({ min: residualYExtent.min, max: residualYExtent.max })
                      }
                      disabled={!residualYExtent}
                      className="text-xs px-2 py-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    >
                      Set manual
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={residualYDomain.min}
                      onChange={(e) =>
                        setResidualYDomain((d) =>
                          d ? { ...d, min: Number(e.target.value) || 0 } : null
                        )
                      }
                      step="any"
                      className="w-16 text-xs px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700"
                    />
                    <span className="text-zinc-400 text-xs">to</span>
                    <input
                      type="number"
                      value={residualYDomain.max}
                      onChange={(e) =>
                        setResidualYDomain((d) =>
                          d ? { ...d, max: Number(e.target.value) || 0 } : null
                        )
                      }
                      step="any"
                      className="w-16 text-xs px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setResidualYDomain(null)}
                      className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      Auto
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Positive = underpredicting, negative = overpredicting. Mean residual indicates bias; spread indicates tail behaviour.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={residualsData}
                margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#71717a" }}
                  tickFormatter={formatXTick}
                  interval="preserveStartEnd"
                  ticks={midnightTicks}
                  stroke="#d4d4d8"
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={residualYDomain ? [residualYDomain.min, residualYDomain.max] : undefined}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  stroke="#d4d4d8"
                  label={{
                    value: "Residual (EUR/MWh)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 10, fill: "#a1a1aa" },
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
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
                {modelKeys.map(({ prefix, color, label }) => (
                  <Line
                    key={prefix}
                    dataKey={`${prefix}_residual`}
                    stroke={color}
                    strokeWidth={1.2}
                    dot={false}
                    name={label}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            {residualMeans.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-2 text-xs">
                {residualMeans.map(({ label, color, mean }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-zinc-600">{label}:</span>
                    <span className={`font-mono tabular-nums ${mean > 2 ? "text-amber-600" : mean < -2 ? "text-amber-600" : "text-zinc-500"}`}>
                      mean = {mean.toFixed(2)} {mean > 0 ? "(underpredicting)" : mean < 0 ? "(overpredicting)" : "(unbiased)"}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Residual distribution histogram (tail behaviour) */}
          {histogramData.length > 0 && (
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <h3 className="text-sm font-medium text-zinc-700 mb-2">
                Residual Distribution
              </h3>
              <p className="text-xs text-zinc-500 mb-3">
                Histogram of residuals. Heavy tails or skew indicate asymmetric prediction errors.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={histogramData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="bin"
                    tick={{ fontSize: 9, fill: "#71717a" }}
                    stroke="#d4d4d8"
                    label={{
                      value: "Residual (EUR/MWh)",
                      position: "insideBottom",
                      offset: -5,
                      style: { fontSize: 10, fill: "#a1a1aa" },
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    stroke="#d4d4d8"
                    label={{
                      value: "Count",
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
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {modelKeys.map(({ prefix, color, label }) => (
                    <Bar
                      key={prefix}
                      dataKey={`${prefix}_count`}
                      name={label}
                      fill={color}
                      fillOpacity={0.7}
                      radius={[2, 2, 0, 0]}
                      isAnimationActive={false}
                    >
                      {histogramData.map((_, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {extremeEventStats && <ExtremeEventStatsCard stats={extremeEventStats} />}

          {/* Metrics table */}
          {viewMetrics.length > 0 && (
            <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-medium text-zinc-600">
                  Metrics for {isZoomed ? "zoomed region" : "visible range"} ({viewData.length} points, {Math.ceil(viewData.length / 24)} days)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left py-2 px-4 font-medium text-zinc-500">Model</th>
                      <th className="text-right py-2 px-4 font-medium text-zinc-500">MAE</th>
                      <th className="text-right py-2 px-4 font-medium text-zinc-500">RMSE</th>
                      <th className="text-right py-2 px-4 font-medium text-zinc-500">MPIW</th>
                      <th className="text-right py-2 px-4 font-medium text-zinc-500">Interval Score</th>
                      <th className="text-right py-2 px-4 font-medium text-zinc-500">CRPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewMetrics.map((m) => {
                      const fmt = (v: number | null) => v != null ? v.toFixed(2) : "—";
                      return (
                        <tr key={m.label} className="border-b border-zinc-50 last:border-0">
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                              <span className="text-zinc-700 font-medium">{m.label}</span>
                            </div>
                          </td>
                          <td className="text-right py-2 px-4 tabular-nums text-zinc-600">{fmt(m.mae)}</td>
                          <td className="text-right py-2 px-4 tabular-nums text-zinc-600">{fmt(m.rmse)}</td>
                          <td className="text-right py-2 px-4 tabular-nums text-zinc-600">{fmt(m.mpiw)}</td>
                          <td className="text-right py-2 px-4 tabular-nums text-zinc-600">{fmt(m.intervalScore)}</td>
                          <td className="text-right py-2 px-4 tabular-nums text-zinc-600">{fmt(m.crps)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Overview when zoomed */}
          {isZoomed && (
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">Slider window overview — click to reset zoom</span>
              </div>
              <div className="cursor-pointer" onClick={resetZoom}>
                <ResponsiveContainer width="100%" height={100}>
                  <ComposedChart data={sliderData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 8, fill: "#a1a1aa" }}
                      tickFormatter={formatXTick}
                      interval={Math.max(1, Math.floor(sliderData.length / 8))}
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
                      x1={sliderData[zoomStartIdx!]?.date}
                      x2={sliderData[zoomEndIdx!]?.date}
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
            {allData.length} hourly data points ({Math.ceil(allData.length / 24)} days total).
            {" "}Use the controls above to navigate, then drag on the chart to zoom further.
          </div>
        </>
      )}
    </div>
  );
}
