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

  const data: PredictionPoint[] = [];
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

  const totalDays = Math.max(1, Math.ceil(data.length / 24));
  return { keys, data, totalDays };
}
