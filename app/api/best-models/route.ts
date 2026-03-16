import { NextRequest, NextResponse } from "next/server";
import { getBestModels } from "@/lib/results";
import { METRIC_LABELS } from "@/lib/types";

const VALID_METRICS = new Set(Object.keys(METRIC_LABELS));

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const n = Math.min(10, Math.max(1, parseInt(searchParams.get("n") || "5", 10) || 5));
  const metricParam = searchParams.get("metric") || "MAE";
  const metric = VALID_METRICS.has(metricParam) ? metricParam : "MAE";

  try {
    const models = getBestModels(n, metric);
    return NextResponse.json({ models, metric });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get best models: ${error}` },
      { status: 500 }
    );
  }
}
