import { METHODOLOGY } from "./methodology";

/** Match train / val / test shading on the methodology “Data Split Timeline” chart. */
export const SPLIT_OVERLAY_COLORS = {
  train: "#2563eb",
  validation: "#16a34a",
  test: "#dc2626",
} as const;

export const EXPERIMENT_DATA_SPLIT = METHODOLOGY.dataSplit;

export function parseExperimentDate(s: string): number {
  return new Date(s + "T00:00:00Z").getTime();
}

/**
 * Returns x1/x2 for Recharts ReferenceArea along the visible window, using category keys that
 * exist in viewData so shaded bands still render correctly when the user zooms.
 */
export function getVisibleSplitSegmentBounds(
  viewData: { date?: string; [key: string]: unknown }[],
  xDataKey: string,
  segmentStart: string,
  segmentEnd: string
): { x1: string; x2: string } | null {
  if (viewData.length === 0) return null;
  const segStart = parseExperimentDate(segmentStart);
  const segEnd = parseExperimentDate(segmentEnd);
  const firstVisible = String(viewData[0]?.[xDataKey] ?? "");
  const lastVisible = String(viewData[viewData.length - 1]?.[xDataKey] ?? "");
  const visibleStart = firstVisible ? parseExperimentDate(firstVisible) : 0;
  const visibleEnd = lastVisible ? parseExperimentDate(lastVisible) : 0;

  const overlapStart = Math.max(visibleStart, segStart);
  const overlapEnd = Math.min(visibleEnd, segEnd);
  if (overlapStart >= overlapEnd) return null;

  let x1: string | null = null;
  let x2: string | null = null;
  for (const d of viewData) {
    const dateStr = String(d[xDataKey] ?? "");
    if (!dateStr) continue;
    const t = parseExperimentDate(dateStr);
    if (t >= overlapStart && t <= overlapEnd) {
      if (!x1) x1 = dateStr;
      x2 = dateStr;
    }
  }
  return x1 && x2 ? { x1, x2 } : null;
}
