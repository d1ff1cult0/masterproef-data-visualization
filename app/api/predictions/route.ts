import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  getPredictionsPath,
  listRunsWithPredictions,
} from "@/lib/results";
import { buildPredictionDataFromMergedArrays } from "@/lib/build-prediction-points";

function pythonCandidates(): string[] {
  const home = process.env.HOME || "";
  const candidates = [
    process.env.PYTHON_BIN,
    "python3",
    "python",
    home && `${home}/miniforge3/bin/python3`,
    home && `${home}/miniconda3/bin/python3`,
    home && `${home}/anaconda3/bin/python3`,
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
  ].filter((v): v is string => Boolean(v));
  return Array.from(new Set(candidates));
}

function runNpzMerge(
  npzPaths: string[]
): { ok: true; arrays: Record<string, unknown> } | { ok: false; error: string; detail?: string } {
  if (npzPaths.length === 0) return { ok: false, error: "no_npz_paths" };
  const script = path.join(process.cwd(), "scripts", "npz_predictions_bundle.py");
  if (!fs.existsSync(script)) {
    return { ok: false, error: "bundle_script_missing", detail: script };
  }
  let r: ReturnType<typeof spawnSync> | null = null;
  const tried: string[] = [];
  for (const bin of pythonCandidates()) {
    tried.push(bin);
    r = spawnSync(bin, [script, ...npzPaths], {
      encoding: "utf-8",
      maxBuffer: 512 * 1024 * 1024,
      windowsHide: true,
    });
    if (!r.error) break;
  }
  if (!r || r.error) {
    return {
      ok: false,
      error: "python_spawn_failed",
      detail: `tried: ${tried.join(", ")}; last error: ${r?.error ? String(r.error) : "none"}`,
    };
  }
  const out = (r.stdout || "").trim();
  if (!out) {
    return {
      ok: false,
      error: "python_empty_stdout",
      detail: r.stderr?.slice(0, 500) || `exit ${r.status}`,
    };
  }
  try {
    const j = JSON.parse(out) as { ok?: boolean; arrays?: Record<string, unknown>; error?: string };
    if (!j.ok) return { ok: false, error: j.error || "python_merge_failed" };
    if (!j.arrays) return { ok: false, error: "python_no_arrays" };
    return { ok: true, arrays: j.arrays };
  } catch (e) {
    return { ok: false, error: "invalid_json_from_python", detail: String(e) };
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const experiment = p.get("experiment");
  const model = p.get("model");
  const run = p.get("run") ?? "average";
  const startDay = parseInt(p.get("startDay") || "0", 10);
  const endDay = parseInt(p.get("endDay") || "9999", 10);

  if (!experiment || model == null || model === "") {
    return NextResponse.json(
      { error: "experiment and model are required" },
      { status: 400 }
    );
  }

  const npzPaths: string[] = [];
  if (run === "average") {
    const idxs = listRunsWithPredictions(experiment, model);
    for (const i of idxs) npzPaths.push(getPredictionsPath(experiment, model, i));
  } else {
    const runIdx = parseInt(run, 10);
    if (Number.isNaN(runIdx)) {
      return NextResponse.json({ error: "invalid run" }, { status: 400 });
    }
    const single = getPredictionsPath(experiment, model, runIdx);
    if (!fs.existsSync(single)) {
      return NextResponse.json(
        {
          error: `no predictions.npz for ${experiment}/${model} run_${runIdx}`,
        },
        { status: 404 }
      );
    }
    npzPaths.push(single);
  }

  if (npzPaths.length === 0) {
    return NextResponse.json(
      {
        error:
          `no predictions.npz under ${experiment}/${model}. ` +
          `Rolling baselines often skip test predictions; use online_daily for forecast lines.`,
      },
      { status: 404 }
    );
  }

  const merged = runNpzMerge(npzPaths);
  if (!merged.ok) {
    const body: Record<string, unknown> = { error: merged.error };
    if ("detail" in merged && merged.detail) body.detail = merged.detail;
    return NextResponse.json(body, { status: 500 });
  }

  let { keys, data, totalDays } = buildPredictionDataFromMergedArrays(merged.arrays);
  if (data.length === 0) {
    return NextResponse.json({ error: "empty_prediction_series" }, { status: 422 });
  }

  const startIdx = Math.max(0, startDay * 24);
  const endIdxExclusive =
    endDay >= 9999 ? data.length : Math.min(data.length, (endDay + 1) * 24);
  data = data.slice(startIdx, endIdxExclusive);

  return NextResponse.json({
    experiment,
    model,
    run,
    totalDays,
    startDay,
    endDay,
    keys,
    data,
  });
}
