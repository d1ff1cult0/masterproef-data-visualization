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
  children: React.ReactNode;
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

  const ChartComponent = chartType === "LineChart" ? LineChart : ComposedChart;
  const firstX = viewData[0]?.[xDataKey];
  const lastX = viewData[viewData.length - 1]?.[xDataKey];

  return (
    <div>
      <div className="text-xs text-zinc-400 mb-2 flex items-center justify-between gap-2">
        <span>
          {isZoomed
            ? `Zoomed: ${formatXLabel ? formatXLabel(String(firstX)) : String(firstX)} to ${formatXLabel ? formatXLabel(String(lastX)) : String(lastX)} (${viewData.length} points) — drag to zoom further`
            : "Drag on the chart to zoom into a region"}
        </span>
        {isZoomed && (
          <button
            type="button"
            onClick={resetZoom}
            className="shrink-0 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            Reset zoom
          </button>
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
          {children}
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
