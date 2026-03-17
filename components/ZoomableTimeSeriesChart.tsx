"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  ComposedChart,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

type ChartRecord = Record<string, string | number | undefined>;

interface ZoomableTimeSeriesChartProps {
  data: ChartRecord[];
  xDataKey: string;
  height?: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  children: React.ReactNode | ((viewData: ChartRecord[]) => React.ReactNode);
  chartType?: "LineChart" | "ComposedChart";
  minZoomPoints?: number;
  formatXLabel?: (v: string) => string;
}

export function ZoomableTimeSeriesChart({
  data,
  xDataKey,
  height = 280,
  margin = { top: 10, right: 10, bottom: 30, left: 50 },
  children,
  chartType = "ComposedChart",
  minZoomPoints = 12,
  formatXLabel,
}: ZoomableTimeSeriesChartProps) {
  const [zoomLeft, setZoomLeft] = useState<string | number | null>(null);
  const [zoomRight, setZoomRight] = useState<string | number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [zoomStartIdx, setZoomStartIdx] = useState<number | null>(null);
  const [zoomEndIdx, setZoomEndIdx] = useState<number | null>(null);

  const viewData = useMemo(() => {
    if (zoomStartIdx != null && zoomEndIdx != null) {
      return data.slice(zoomStartIdx, zoomEndIdx + 1);
    }
    return data;
  }, [data, zoomStartIdx, zoomEndIdx]);

  const isZoomed = zoomStartIdx != null && zoomEndIdx != null;

  const handleMouseDown = useCallback(
    (e: { activeLabel?: string }) => {
      if (e?.activeLabel) {
        setSelecting(true);
        setZoomLeft(e.activeLabel);
        setZoomRight(null);
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: { activeLabel?: string }) => {
      if (selecting && e?.activeLabel) {
        setZoomRight(e.activeLabel);
      }
    },
    [selecting]
  );

  const handleMouseUp = useCallback(() => {
    if (!selecting || zoomLeft == null || zoomRight == null) {
      setSelecting(false);
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }
    setSelecting(false);

    const leftIdx = data.findIndex((d) => String(d[xDataKey]) === String(zoomLeft));
    const rightIdx = data.findIndex((d) => String(d[xDataKey]) === String(zoomRight));

    if (leftIdx === -1 || rightIdx === -1) {
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }

    let [lo, hi] = leftIdx < rightIdx ? [leftIdx, rightIdx] : [rightIdx, leftIdx];
    if (hi - lo < minZoomPoints) {
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }

    setZoomStartIdx(lo);
    setZoomEndIdx(hi);
    setZoomLeft(null);
    setZoomRight(null);
  }, [data, xDataKey, minZoomPoints, selecting, zoomLeft, zoomRight]);

  const resetZoom = useCallback(() => {
    setZoomStartIdx(null);
    setZoomEndIdx(null);
    setZoomLeft(null);
    setZoomRight(null);
  }, []);

  const windowSize =
    zoomStartIdx != null && zoomEndIdx != null
      ? zoomEndIdx - zoomStartIdx + 1
      : 0;
  const scrollStep = Math.max(1, Math.floor(windowSize * 0.2));

  const scrollLeft = useCallback(() => {
    if (zoomStartIdx == null || zoomEndIdx == null) return;
    const step = Math.min(scrollStep, zoomStartIdx);
    if (step <= 0) return;
    setZoomStartIdx(zoomStartIdx - step);
    setZoomEndIdx(zoomEndIdx - step);
  }, [zoomStartIdx, zoomEndIdx, scrollStep]);

  const scrollRight = useCallback(() => {
    if (zoomStartIdx == null || zoomEndIdx == null) return;
    const maxEnd = data.length - 1;
    const step = Math.min(scrollStep, maxEnd - zoomEndIdx);
    if (step <= 0) return;
    setZoomStartIdx(zoomStartIdx + step);
    setZoomEndIdx(zoomEndIdx + step);
  }, [zoomStartIdx, zoomEndIdx, scrollStep, data.length]);

  const canScrollLeft = isZoomed && zoomStartIdx != null && zoomStartIdx > 0;
  const canScrollRight =
    isZoomed && zoomEndIdx != null && zoomEndIdx < data.length - 1;

  const ChartComponent = chartType === "LineChart" ? LineChart : ComposedChart;
  const firstX = viewData[0]?.[xDataKey];
  const lastX = viewData[viewData.length - 1]?.[xDataKey];

  const chartChildren =
    typeof children === "function" ? children(viewData) : children;

  return (
    <div>
      <div className="text-xs text-zinc-400 mb-2 flex items-center justify-between gap-2">
        <span>
          {isZoomed
            ? `Zoomed: ${formatXLabel ? formatXLabel(String(firstX)) : String(firstX)} to ${formatXLabel ? formatXLabel(String(lastX)) : String(lastX)} (${viewData.length} points) — use arrows to scroll, drag to zoom further`
            : "Drag on the chart to zoom into a region"}
        </span>
        {isZoomed && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              title="Scroll left"
              className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={scrollRight}
              disabled={!canScrollRight}
              title="Scroll right"
              className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              Reset zoom
            </button>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={viewData}
          margin={margin}
          onMouseDown={handleMouseDown as never}
          onMouseMove={handleMouseMove as never}
          onMouseUp={handleMouseUp as never}
        >
          {chartChildren}
          {zoomLeft != null && zoomRight != null && (
            <ReferenceArea
              x1={zoomLeft}
              x2={zoomRight}
              strokeOpacity={0.3}
              fill="#3b82f6"
              fillOpacity={0.1}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
