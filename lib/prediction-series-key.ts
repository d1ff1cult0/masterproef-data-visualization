/**
 * Stable Recharts/data object prefix for a selected experiment+model pair.
 * Must match between merged prediction rows and modelKeys (nested model paths
 * like rolling_pit_full/online_daily must not use only the last path segment).
 */
export function predictionSeriesFieldPrefix(experiment: string, model: string): string {
  const raw = `${experiment}|${model}`;
  const s = raw.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  return s.length > 0 ? s : "series";
}

/** Human-readable legend label for a stored model path. */
export function formatModelPathLabel(model: string): string {
  return model
    .split("/")
    .map((seg) => seg.replace(/_/g, " "))
    .join(" · ");
}
