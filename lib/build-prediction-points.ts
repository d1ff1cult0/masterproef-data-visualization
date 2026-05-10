import type { PredictionPoint } from "./types";
import { PREDICTION_CHART_TEST_START } from "./results";

function matrixShape(yTest: unknown): { rows: number; horizon: number } {
  if (!Array.isArray(yTest) || yTest.length === 0) return { rows: 0, horizon: 0 };
  const first = yTest[0];
  if (Array.isArray(first)) return { rows: yTest.length, horizon: first.length };
  return { rows: yTest.length, horizon: 1 };
}

function cell2d(
  arr: number[] | number[][] | undefined,
  r: number,
  h: number,
  horizon: number
): number | undefined {
  if (arr == null) return undefined;
  if (horizon === 1) {
    const row = (arr as number[])[r];
    return typeof row === "number" ? row : undefined;
  }
  const row = (arr as number[][])[r];
  if (!Array.isArray(row)) return undefined;
  const v = row[h];
  return typeof v === "number" ? v : undefined;
}

/**
 * Detect hourly-stride sliding-window outputs. The new notebooks save shape
 * (n_hours, 24) where consecutive rows overlap by horizon-1 hours; the legacy
 * layout is (n_days, 24) with no overlap. Test: does y_test[i+1][0] equal
 * y_test[i][1]? Real prices match exactly under the same scaler.
 */
function isHourlyStride(yTest: unknown, rows: number, horizon: number): boolean {
  if (rows < 2 || horizon < 2) return false;
  if (!Array.isArray(yTest)) return false;
  const r0 = yTest[0];
  const r1 = yTest[1];
  if (!Array.isArray(r0) || !Array.isArray(r1)) return false;
  const a = r0[1];
  const b = r1[0];
  if (typeof a !== "number" || typeof b !== "number") return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const tol = Math.max(1e-3, Math.abs(a) * 1e-4);
  return Math.abs(a - b) < tol;
}

/** Flatten an hourly-stride (rows, horizon) array into a single hourly series. */
function deoverlap(arr: unknown, rows: number, horizon: number): number[] {
  const out: number[] = new Array(rows + horizon - 1).fill(NaN);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < rows; i++) {
    const row = (arr as number[][])[i];
    if (!Array.isArray(row)) continue;
    const v = row[0];
    if (typeof v === "number") out[i] = v;
  }
  const last = (arr as number[][])[rows - 1];
  if (Array.isArray(last)) {
    for (let h = 1; h < horizon; h++) {
      const v = last[h];
      if (typeof v === "number") out[rows - 1 + h] = v;
    }
  }
  return out;
}

/**
 * Turn mean-merged float arrays (from npz_predictions_bundle.py) into hourly chart rows.
 */
export function buildPredictionDataFromMergedArrays(
  arrays: Record<string, unknown>
): { keys: string[]; data: PredictionPoint[]; totalDays: number } {
  const yTest = arrays.y_test;
  const { rows, horizon } = matrixShape(yTest);
  if (rows === 0 || horizon === 0) {
    return { keys: [], data: [], totalDays: 0 };
  }

  const keys = Object.keys(arrays).filter((k) => k !== "y_test");
  const hourly = isHourlyStride(yTest, rows, horizon);

  const data: PredictionPoint[] = [];

  if (hourly) {
    const yFlat = deoverlap(yTest, rows, horizon);
    const seriesCache = new Map<string, number[]>();
    for (const k of keys) seriesCache.set(k, deoverlap(arrays[k], rows, horizon));

    for (let flat = 0; flat < yFlat.length; flat++) {
      const yv = yFlat[flat];
      const day = Math.floor(flat / 24);
      const hour = flat % 24;
      const dayDate = new Date(PREDICTION_CHART_TEST_START);
      dayDate.setUTCDate(dayDate.getUTCDate() + day);
      const dateStr = `${dayDate.toISOString().split("T")[0]} ${String(hour).padStart(2, "0")}:00`;

      const p: PredictionPoint = {
        index: flat,
        day,
        hour,
        date: dateStr,
        y_test: Number.isFinite(yv) ? yv : 0,
      };
      for (const k of keys) {
        const v = seriesCache.get(k)?.[flat];
        if (v != null && Number.isFinite(v)) {
          (p as Record<string, number>)[k] = v;
        }
      }
      data.push(p);
    }
  } else {
    let flat = 0;
    for (let r = 0; r < rows; r++) {
      for (let h = 0; h < horizon; h++) {
        const yvRaw = cell2d(yTest as number[][], r, h, horizon);
        const yv =
          yvRaw != null && !Number.isNaN(yvRaw) ? yvRaw : Number.NaN;

        const day = Math.floor(flat / 24);
        const hour = flat % 24;
        const dayDate = new Date(PREDICTION_CHART_TEST_START);
        dayDate.setUTCDate(dayDate.getUTCDate() + day);
        const dateStr = `${dayDate.toISOString().split("T")[0]} ${String(hour).padStart(2, "0")}:00`;

        const p: PredictionPoint = {
          index: flat,
          day,
          hour,
          date: dateStr,
          y_test: Number.isFinite(yv) ? yv : 0,
        };

        for (const k of keys) {
          const v = cell2d(arrays[k] as number[][], r, h, horizon);
          if (v != null && !Number.isNaN(v)) {
            (p as Record<string, number>)[k] = v;
          }
        }
        data.push(p);
        flat++;
      }
    }
  }

  const totalDays = Math.max(1, Math.ceil(data.length / 24));
  return { keys, data, totalDays };
}
