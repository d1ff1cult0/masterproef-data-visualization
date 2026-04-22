"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ComposedChart,
  LineChart,
  Line,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from "recharts";
import type { EDAResult, SummaryStatRow } from "@/lib/eda";
import {
  EXPERIMENT_DATA_SPLIT,
  SPLIT_OVERLAY_COLORS,
  getVisibleSplitSegmentBounds,
} from "@/lib/experiment-split-overlay";
import { ZoomableTimeSeriesChart } from "./ZoomableTimeSeriesChart";
import { ExportableChart } from "./ExportableChart";
import ExportSettingsModal from "./ExportSettingsModal";
import type { ExportSettings } from "./ExportableChart";
import {
  EdaChartExportProvider,
  useEdaChartExportRegistry,
} from "@/lib/eda-chart-export-context";

// ──────────────────── Color Utilities ────────────────────

function heatColor(value: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  const r = Math.round(8 + t * 230);
  const g = Math.round(80 + (1 - Math.abs(t - 0.5) * 2) * 100);
  const b = Math.round(238 - t * 200);
  return `rgb(${r},${g},${b})`;
}

function corrColor(value: number): string {
  if (value >= 0) {
    const t = value;
    return `rgb(${Math.round(255 - t * 217)},${Math.round(255 - t * 155)},${255})`;
  } else {
    const t = -value;
    return `rgb(255,${Math.round(255 - t * 155)},${Math.round(255 - t * 217)})`;
  }
}

const COLORS = {
  primary: "#2563eb",
  secondary: "#dc2626",
  tertiary: "#16a34a",
  quaternary: "#ca8a04",
  purple: "#9333ea",
  cyan: "#0891b2",
  orange: "#ea580c",
  pink: "#db2777",
};

/** Top legend + margins so PNG exports avoid large empty bands under default bottom legends. */
const EDA_MARGIN_TOP_LEGEND = { top: 28, right: 12, bottom: 16, left: 52 };
/** More bottom space for angled X-axis labels. */
const EDA_MARGIN_TOP_LEGEND_ANGL = { top: 28, right: 12, bottom: 40, left: 52 };

const EDA_LEGEND_TOP_PROPS = {
  verticalAlign: "top" as const,
  align: "center" as const,
  wrapperStyle: {
    fontSize: 11,
    lineHeight: "14px",
    paddingBottom: 0,
    width: "100%",
    display: "flex",
    justifyContent: "center",
  } as const,
};

// ──────────────────── Collapsible Section ────────────────────

function Section({
  id,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-zinc-800">{title}</span>
        </div>
        {description && <span className="text-xs text-zinc-400 hidden md:block">{description}</span>}
      </button>
      {expanded && <div className="px-5 pb-5 pt-1 border-t border-zinc-100">{children}</div>}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-zinc-800 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}

const ALL_SECTIONS = [
  "overview", "summary", "timeseries", "distribution", "negative", "temporal",
  "heatmaps", "weekday", "correlation", "crossborder", "load", "renewables",
  "flows", "acf", "features", "outliers", "pairplot", "volatility", "yoy",
];

// ──────────────────── Main Component ────────────────────

export default function EDAView() {
  const [data, setData] = useState<EDAResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/eda")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load EDA data");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Computing exploratory analysis...</p>
          <p className="text-xs text-zinc-400 mt-1">This may take a few seconds on first load</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-sm font-medium text-red-800">Failed to load EDA data</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <EdaChartExportProvider>
      <EDAViewContent data={data} />
    </EdaChartExportProvider>
  );
}

function EDAViewContent({ data }: { data: EDAResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["overview", "summary"]));
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const [bulkExportSettings, setBulkExportSettings] = useState<ExportSettings>({
    includeTitle: true,
    fontSize: 12,
    boldLabels: true,
    dpi: 300,
    backgroundColor: "#ffffff",
  });
  const edaRegistry = useEdaChartExportRegistry();

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(ALL_SECTIONS));
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const runBulkExport = useCallback(
    async (settings: ExportSettings) => {
      setBulkExportSettings(settings);
      expandAll();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 600));
      const dateStamp = new Date().toISOString().slice(0, 10);
      const zipName = `eda_BE_hourly_price_dashboard_figures_${dateStamp}.zip`;
      await edaRegistry?.exportAllAsZip(settings, zipName);
      setBulkExportOpen(false);
    },
    [edaRegistry, expandAll]
  );

  const S = (id: string, title: string, desc: string, children: React.ReactNode) => (
    <Section id={id} title={title} description={desc} expanded={expanded.has(id)} onToggle={toggle}>
      {children}
    </Section>
  );

  return (
    <div className="p-6 space-y-3 max-w-[1400px] mx-auto">
      <ExportSettingsModal
        isOpen={bulkExportOpen}
        onClose={() => setBulkExportOpen(false)}
        onExport={runBulkExport}
        defaultSettings={bulkExportSettings}
        modalTitle="Export all charts (ZIP)"
        modalDescription="All sections will be expanded first, then one ZIP file downloads containing every figure as a PNG with a descriptive filename. Export options apply to each image."
        submitButtonLabel="Download ZIP"
        includeTitleOption
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Exploratory Data Analysis</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Belgian Electricity Prices (ENTSO-E) &mdash; {data.overview.totalRows.toLocaleString()} hourly observations</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setBulkExportOpen(true)}
            className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md shadow-sm transition-colors"
          >
            Export all (ZIP)
          </button>
          <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Expand All</button>
          <button onClick={collapseAll} className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100 transition-colors">Collapse All</button>
        </div>
      </div>

      {/* ────── 1. Dataset Overview ────── */}
      {S("overview", "Dataset Overview", `${data.overview.totalRows.toLocaleString()} rows, ${data.overview.totalColumns} columns`, (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Observations" value={data.overview.totalRows.toLocaleString()} sub="hourly data points" />
            <StatCard label="Features" value={data.overview.totalColumns} sub="columns in dataset" />
            <StatCard label="Date Range" value={`${data.overview.dateRange.start.slice(0, 10)} to ${data.overview.dateRange.end.slice(0, 10)}`} sub={`~${Math.round(data.overview.totalRows / 8760)} years`} />
            <StatCard label="Frequency" value={data.overview.frequency} sub="1 observation per hour" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Price Mean" value={`${data.priceDistribution.stats.mean} EUR/MWh`} />
            <StatCard label="Price Std" value={`${data.priceDistribution.stats.std} EUR/MWh`} />
            <StatCard label="Negative Prices" value={`${data.negativePrices.count} (${data.negativePrices.pct}%)`} />
            <StatCard label="Peak vs Off-Peak" value={`${data.peakOffPeak.peak.mean} vs ${data.peakOffPeak.offPeak.mean}`} sub="EUR/MWh mean" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-zinc-600 mb-2">Columns</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.overview.columns.map((col) => (
                <span key={col} className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">{col}</span>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ────── 2. Summary Statistics ────── */}
      {S("summary", "Summary Statistics", "Descriptive statistics for all numeric features", (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="text-left py-2 px-2 font-medium sticky left-0 bg-white">Feature</th>
                <th className="text-right py-2 px-2 font-medium">Count</th>
                <th className="text-right py-2 px-2 font-medium">Mean</th>
                <th className="text-right py-2 px-2 font-medium">Std</th>
                <th className="text-right py-2 px-2 font-medium">Min</th>
                <th className="text-right py-2 px-2 font-medium">25%</th>
                <th className="text-right py-2 px-2 font-medium">50%</th>
                <th className="text-right py-2 px-2 font-medium">75%</th>
                <th className="text-right py-2 px-2 font-medium">Max</th>
                <th className="text-right py-2 px-2 font-medium">Skew</th>
                <th className="text-right py-2 px-2 font-medium">Kurt</th>
                <th className="text-right py-2 px-2 font-medium">IQR</th>
              </tr>
            </thead>
            <tbody>
              {data.summaryStats.map((row: SummaryStatRow, i: number) => (
                <tr key={row.column} className={i % 2 === 0 ? "bg-zinc-50/50" : ""}>
                  <td className="py-1.5 px-2 font-medium text-zinc-700 sticky left-0 bg-inherit">{row.column}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{row.count.toLocaleString()}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.mean)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.std)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.min)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.q25)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.median)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.q75)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.max)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.skewness)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.kurtosis)}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">{fmt(row.iqr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ────── 3. Price Time Series ────── */}
      {S("timeseries", "Price Time Series", "Daily average with 7-day rolling mean/std", (
        <div className="space-y-6">
          <ExportableChart
            title="Daily Average Price with Rolling Mean & Std Band"
            filename="eda_BE_hourly_price_daily_average_7d_rolling_mean_and_std_band"
            edaRegister={{ key: "eda-ts-daily-avg-roll", order: 0 }}
          >
          <div>
            <ZoomableTimeSeriesChart
              data={data.priceSeries}
              xDataKey="date"
              height={350}
              formatXLabel={(v) => v.slice(5)}
              margin={EDA_MARGIN_TOP_LEGEND}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval={Math.floor(data.priceSeries.length / 12)} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line dataKey="avg" stroke={COLORS.primary} strokeWidth={1} dot={false} opacity={0.4} name="Daily Avg" />
              <Line dataKey="rollingMean" stroke={COLORS.secondary} strokeWidth={2} dot={false} name="7d Rolling Mean" />
              <Legend {...EDA_LEGEND_TOP_PROPS} />
            </ZoomableTimeSeriesChart>
          </div>
          </ExportableChart>
          <ExportableChart
            title="Daily Average Price with Rolling Mean & Std Band (experiment train / val / test)"
            filename="eda_BE_hourly_price_daily_average_7d_rolling_mean_std_band_train_val_test_split"
            edaRegister={{ key: "eda-ts-daily-avg-roll-split", order: 1 }}
          >
            <div>
              <ZoomableTimeSeriesChart
                data={data.priceSeries}
                xDataKey="date"
                height={350}
                formatXLabel={(v) => v.slice(5)}
                margin={EDA_MARGIN_TOP_LEGEND}
              >
                {(viewData) => {
                  const ds = EXPERIMENT_DATA_SPLIT;
                  const trainBounds = getVisibleSplitSegmentBounds(
                    viewData,
                    "date",
                    ds.trainStart,
                    ds.trainEnd
                  );
                  const valBounds = getVisibleSplitSegmentBounds(
                    viewData,
                    "date",
                    ds.valStart,
                    ds.valEnd
                  );
                  const testBounds = getVisibleSplitSegmentBounds(
                    viewData,
                    "date",
                    ds.testStart,
                    ds.testEnd
                  );
                  return (
                    <>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                        interval={Math.floor(data.priceSeries.length / 12)}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        label={{
                          value: "EUR/MWh",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 10 },
                        }}
                      />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      {trainBounds && (
                        <ReferenceArea
                          x1={trainBounds.x1}
                          x2={trainBounds.x2}
                          fill={SPLIT_OVERLAY_COLORS.train}
                          fillOpacity={0.2}
                        />
                      )}
                      {valBounds && (
                        <ReferenceArea
                          x1={valBounds.x1}
                          x2={valBounds.x2}
                          fill={SPLIT_OVERLAY_COLORS.validation}
                          fillOpacity={0.2}
                        />
                      )}
                      {testBounds && (
                        <ReferenceArea
                          x1={testBounds.x1}
                          x2={testBounds.x2}
                          fill={SPLIT_OVERLAY_COLORS.test}
                          fillOpacity={0.2}
                        />
                      )}
                      <Line
                        dataKey="avg"
                        stroke={COLORS.primary}
                        strokeWidth={1}
                        dot={false}
                        opacity={0.4}
                        name="Daily Avg"
                      />
                      <Line
                        dataKey="rollingMean"
                        stroke={COLORS.secondary}
                        strokeWidth={2}
                        dot={false}
                        name="7d Rolling Mean"
                      />
                      <Legend {...EDA_LEGEND_TOP_PROPS} />
                    </>
                  );
                }}
              </ZoomableTimeSeriesChart>
              <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-[11px] text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: SPLIT_OVERLAY_COLORS.train }}
                  />
                  Train
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: SPLIT_OVERLAY_COLORS.validation }}
                  />
                  Validation
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: SPLIT_OVERLAY_COLORS.test }}
                  />
                  Test
                </span>
              </p>
            </div>
          </ExportableChart>
          <ExportableChart
            title="7-Day Rolling Standard Deviation"
            filename="eda_BE_hourly_price_7d_rolling_standard_deviation"
            edaRegister={{ key: "eda-ts-rolling-std", order: 2 }}
          >
          <div>
            <ZoomableTimeSeriesChart data={data.priceSeries} xDataKey="date" height={200} chartType="LineChart" formatXLabel={(v) => v.slice(5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval={Math.floor(data.priceSeries.length / 12)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line dataKey="rollingStd" stroke={COLORS.orange} strokeWidth={1.5} dot={false} name="7d Rolling Std" />
            </ZoomableTimeSeriesChart>
          </div>
          </ExportableChart>
          <ExportableChart
            title="Monthly Average Prices"
            filename="eda_BE_hourly_price_monthly_mean_and_median_bars"
            edaRegister={{ key: "eda-ts-monthly", order: 3 }}
          >
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={data.monthlyAvgPrices}
                margin={{ top: 28, right: 12, bottom: 36, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="avg" fill={COLORS.primary} name="Mean" radius={[2, 2, 0, 0]} />
                <Bar dataKey="median" fill={COLORS.cyan} name="Median" radius={[2, 2, 0, 0]} />
                <Legend {...EDA_LEGEND_TOP_PROPS} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </ExportableChart>
        </div>
      ))}

      {/* ────── 4. Price Distribution ────── */}
      {S("distribution", "Price Distribution Analysis", "Histogram, Box Plot, Q-Q Plot", (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Mean" value={`${data.priceDistribution.stats.mean}`} sub="EUR/MWh" />
            <StatCard label="Std Dev" value={`${data.priceDistribution.stats.std}`} sub="EUR/MWh" />
            <StatCard label="Skewness" value={`${data.priceDistribution.stats.skewness}`} sub={data.priceDistribution.stats.skewness > 0 ? "Right-skewed" : "Left-skewed"} />
            <StatCard label="Excess Kurtosis" value={`${data.priceDistribution.stats.kurtosis}`} sub={data.priceDistribution.stats.kurtosis > 0 ? "Heavy-tailed" : "Light-tailed"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExportableChart
              title="Price Histogram"
              filename="eda_BE_hourly_price_distribution_histogram"
              edaRegister={{ key: "eda-dist-histogram", order: 10 }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.priceDistribution.histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="binStart" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(0)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [v, "Count"]} labelFormatter={(v) => `${Number(v).toFixed(0)} EUR/MWh`} />
                  <Bar dataKey="count" fill={COLORS.primary} fillOpacity={0.7}>
                    {data.priceDistribution.histogram.map((entry, i) => (
                      <Cell key={i} fill={entry.binStart < 0 ? COLORS.secondary : COLORS.primary} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
            <ExportableChart
              title="Q-Q Plot (Normal)"
              filename="eda_BE_hourly_price_normal_qq_plot"
              edaRegister={{ key: "eda-dist-qq", order: 11 }}
            >
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="theoretical" name="Theoretical" tick={{ fontSize: 10 }} label={{ value: "Theoretical Quantiles", position: "insideBottom", offset: -2, style: { fontSize: 10 } }} />
                  <YAxis dataKey="actual" name="Actual" tick={{ fontSize: 10 }} label={{ value: "Sample Quantiles", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Scatter data={data.priceDistribution.qqPlot} fill={COLORS.primary} fillOpacity={0.5} r={2} />
                  <ReferenceLine
                    segment={[
                      { x: data.priceDistribution.qqPlot[0]?.theoretical, y: data.priceDistribution.qqPlot[0]?.theoretical },
                      { x: data.priceDistribution.qqPlot[data.priceDistribution.qqPlot.length - 1]?.theoretical, y: data.priceDistribution.qqPlot[data.priceDistribution.qqPlot.length - 1]?.theoretical },
                    ]}
                    stroke={COLORS.secondary}
                    strokeDasharray="4 4"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ExportableChart>
          </div>
          <ExportableChart
            title="Box Plot Summary (Whiskers and IQR)"
            filename="eda_BE_hourly_price_box_plot_summary_visual"
            edaRegister={{ key: "eda-dist-box", order: 12 }}
          >
          <div>
            <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
              <div className="flex items-center gap-6 text-xs flex-wrap">
                <span><b>Min:</b> {data.priceDistribution.boxPlot.min}</span>
                <span><b>Whisker Low:</b> {data.priceDistribution.boxPlot.whiskerLow}</span>
                <span><b>Q1:</b> {data.priceDistribution.boxPlot.q1}</span>
                <span><b>Median:</b> {data.priceDistribution.boxPlot.median}</span>
                <span><b>Q3:</b> {data.priceDistribution.boxPlot.q3}</span>
                <span><b>Whisker High:</b> {data.priceDistribution.boxPlot.whiskerHigh}</span>
                <span><b>Max:</b> {data.priceDistribution.boxPlot.max}</span>
                <span><b>Outliers:</b> {data.priceDistribution.boxPlot.outlierCount}</span>
              </div>
              {/* Visual box plot */}
              <div className="mt-3 relative h-8">
                {(() => {
                  const bp = data.priceDistribution.boxPlot;
                  const range = bp.max - bp.min || 1;
                  const pct = (v: number) => ((v - bp.min) / range) * 100;
                  return (
                    <div className="absolute inset-0">
                      <div className="absolute top-3 h-0.5 bg-zinc-300" style={{ left: `${pct(bp.whiskerLow)}%`, right: `${100 - pct(bp.whiskerHigh)}%` }} />
                      <div className="absolute top-1 h-6 bg-blue-100 border border-blue-400 rounded-sm" style={{ left: `${pct(bp.q1)}%`, width: `${pct(bp.q3) - pct(bp.q1)}%` }} />
                      <div className="absolute top-1 h-6 w-0.5 bg-red-500" style={{ left: `${pct(bp.median)}%` }} />
                      <div className="absolute top-2 w-px h-4 bg-zinc-400" style={{ left: `${pct(bp.whiskerLow)}%` }} />
                      <div className="absolute top-2 w-px h-4 bg-zinc-400" style={{ left: `${pct(bp.whiskerHigh)}%` }} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          </ExportableChart>
          <ExportableChart
            title="Price Duration Curve"
            filename="eda_BE_hourly_price_duration_curve_exceedance"
            edaRegister={{ key: "eda-dist-duration", order: 13 }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.priceDurationCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="pct" tick={{ fontSize: 10 }} label={{ value: "% of time price is exceeded", position: "insideBottom", offset: -2, style: { fontSize: 10 } }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${v} EUR/MWh`, "Price"]} />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Line dataKey="price" stroke={COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ExportableChart>
        </div>
      ))}

      {/* ────── 5. Negative Prices ────── */}
      {S("negative", "Negative Price Analysis", `${data.negativePrices.count} occurrences (${data.negativePrices.pct}%)`, (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Negative Hours" value={data.negativePrices.count} sub={`${data.negativePrices.pct}% of all hours`} />
            <StatCard label="Avg Negative Price" value={`${data.negativePrices.avgNegative} EUR/MWh`} />
            <StatCard label="Min Price" value={`${data.negativePrices.minPrice} EUR/MWh`} />
            <StatCard label="Most Affected Hour" value={(() => { const maxH = data.negativePrices.hourlyDistribution.reduce((a, b) => a.count > b.count ? a : b); return `${maxH.hour}:00 (${maxH.count})`; })()} />
          </div>
          {data.negativePrices.timeline.length > 0 && (
            <ExportableChart
              title="Negative Prices Timeline"
              filename="eda_BE_hourly_negative_price_timeline_scatter"
              edaRegister={{ key: "eda-neg-timeline", order: 20 }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => String(v).slice(0, 10)} />
                  <YAxis dataKey="price" type="number" tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(value: unknown) => [`${Number(value ?? 0)} EUR/MWh`, "Price"]} labelFormatter={(v) => String(v)} />
                  <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
                  <Scatter data={data.negativePrices.timeline} fill={COLORS.secondary} fillOpacity={0.6} r={3} />
                </ScatterChart>
              </ResponsiveContainer>
            </ExportableChart>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExportableChart
              title="Negative Prices by Month"
              filename="eda_BE_hourly_negative_price_count_by_month"
              edaRegister={{ key: "eda-neg-month", order: 21 }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.negativePrices.monthlyDistribution.filter(m => m.count > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill={COLORS.secondary} fillOpacity={0.7} name="Count" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
            <ExportableChart
              title="Negative Prices by Hour of Day"
              filename="eda_BE_hourly_negative_price_count_by_hour"
              edaRegister={{ key: "eda-neg-hour", order: 22 }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.negativePrices.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill={COLORS.orange} fillOpacity={0.7} name="Count" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
          </div>
        </div>
      ))}

      {/* ────── 6. Temporal Patterns ────── */}
      {S("temporal", "Temporal Patterns", "Hourly, daily, and monthly price patterns", (
        <div className="space-y-6">
          <ExportableChart
            title="Average Price by Hour of Day (IQR band)"
            filename="eda_BE_hourly_price_mean_median_by_hour_with_IQR_band"
            edaRegister={{ key: "eda-temp-hour", order: 30 }}
          >
            <p className="text-xs text-zinc-400 mb-2">The shaded band shows the interquartile range (IQR): 25th–75th percentile of prices at each hour.</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={data.temporalPatterns.hourly.map((h) => ({
                  ...h,
                  iqrHeight: h.q75 - h.q25,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Area dataKey="q25" stackId="iqr" fill="transparent" stroke="transparent" />
                <Area dataKey="iqrHeight" stackId="iqr" fill={COLORS.primary} fillOpacity={0.15} stroke="transparent" name="IQR (25th–75th %)" />
                <Line dataKey="mean" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} name="Mean" />
                <Line dataKey="median" stroke={COLORS.secondary} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Median" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ExportableChart>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExportableChart
              title="Average Price by Day of Week"
              filename="eda_BE_hourly_price_mean_median_by_weekday"
              edaRegister={{ key: "eda-temp-dow", order: 31 }}
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.temporalPatterns.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="mean" fill={COLORS.primary} fillOpacity={0.7} name="Mean" radius={[3, 3, 0, 0]}>
                    {data.temporalPatterns.daily.map((entry, i) => (
                      <Cell key={i} fill={entry.day >= 5 ? COLORS.orange : COLORS.primary} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <Bar dataKey="median" fill={COLORS.cyan} fillOpacity={0.5} name="Median" radius={[3, 3, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
            <ExportableChart
              title="Average Price by Month"
              filename="eda_BE_hourly_price_mean_median_by_calendar_month"
              edaRegister={{ key: "eda-temp-month", order: 32 }}
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.temporalPatterns.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="mean" fill={COLORS.purple} fillOpacity={0.7} name="Mean" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="median" fill={COLORS.cyan} fillOpacity={0.5} name="Median" radius={[3, 3, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
          </div>
          {/* Peak vs Off-Peak */}
          <div>
            <h4 className="text-xs font-medium text-zinc-600 mb-2">Peak vs Off-Peak Comparison</h4>
            <p className="text-xs text-zinc-400 mb-3">
              Price peaks occur at ~5–7 (morning) and 16–20 (evening). The split below uses the conventional definition: Peak = weekday 08:00–20:00, Off-Peak = all other hours.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                <div className="text-xs font-semibold text-amber-800 mb-2">Peak Hours ({data.peakOffPeak.peak.count.toLocaleString()} obs)</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Mean</span><span className="font-mono">{data.peakOffPeak.peak.mean} EUR/MWh</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Median</span><span className="font-mono">{data.peakOffPeak.peak.median} EUR/MWh</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Std</span><span className="font-mono">{data.peakOffPeak.peak.std}</span></div>
                </div>
              </div>
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                <div className="text-xs font-semibold text-blue-800 mb-2">Off-Peak Hours ({data.peakOffPeak.offPeak.count.toLocaleString()} obs)</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Mean</span><span className="font-mono">{data.peakOffPeak.offPeak.mean} EUR/MWh</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Median</span><span className="font-mono">{data.peakOffPeak.offPeak.median} EUR/MWh</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Std</span><span className="font-mono">{data.peakOffPeak.offPeak.std}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ────── 7. Price Heatmaps ────── */}
      {S("heatmaps", "Price Heatmaps", "Average price by hour/day and hour/month", (
        <div className="space-y-8">
          <ExportableChart
            title="Average Price: Hour of Day vs Day of Week"
            filename="eda_BE_hourly_price_heatmap_hour_vs_weekday_EUR_per_MWh"
            edaRegister={{ key: "eda-heat-week", order: 40 }}
          >
            <HeatmapGrid
              data={data.heatmaps.weekly}
              rowKey="hour"
              colKey="day"
              rowLabel={(v) => `${v}:00`}
              colLabel={(v) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][v]}
              rows={24}
              cols={7}
            />
          </ExportableChart>
          <ExportableChart
            title="Average Price: Hour of Day vs Month"
            filename="eda_BE_hourly_price_heatmap_hour_vs_month_EUR_per_MWh"
            edaRegister={{ key: "eda-heat-month", order: 41 }}
          >
            <HeatmapGrid
              data={data.heatmaps.monthly}
              rowKey="hour"
              colKey="month"
              rowLabel={(v) => `${v}:00`}
              colLabel={(v) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][v - 1]}
              rows={24}
              cols={12}
              colOffset={1}
            />
          </ExportableChart>
        </div>
      ))}

      {/* ────── 8. Weekend vs Weekday ────── */}
      {S("weekday", "Weekend vs Weekday Comparison", "Price distribution differences", (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
              <div className="text-xs font-semibold text-zinc-700 mb-2">Weekday ({data.weekendWeekday.weekday.count.toLocaleString()} obs)</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Mean</span><span className="font-mono">{data.weekendWeekday.weekday.mean}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Median</span><span className="font-mono">{data.weekendWeekday.weekday.median}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Std</span><span className="font-mono">{data.weekendWeekday.weekday.std}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Min / Max</span><span className="font-mono">{data.weekendWeekday.weekday.min} / {data.weekendWeekday.weekday.max}</span></div>
              </div>
            </div>
            <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
              <div className="text-xs font-semibold text-zinc-700 mb-2">Weekend ({data.weekendWeekday.weekend.count.toLocaleString()} obs)</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Mean</span><span className="font-mono">{data.weekendWeekday.weekend.mean}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Median</span><span className="font-mono">{data.weekendWeekday.weekend.median}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Std</span><span className="font-mono">{data.weekendWeekday.weekend.std}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Min / Max</span><span className="font-mono">{data.weekendWeekday.weekend.min} / {data.weekendWeekday.weekend.max}</span></div>
              </div>
            </div>
          </div>
          <ExportableChart
            title="Price Distribution (Normalized): Weekday vs Weekend"
            filename="eda_BE_hourly_price_weekday_vs_weekend_normalized_histogram"
            edaRegister={{ key: "eda-ww-hist", order: 50 }}
          >
            <p className="text-xs text-zinc-400 mb-2">
              Proportion of observations in each price bin (2nd–98th percentile range). Normalized so weekday and weekend are directly comparable.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={mergeHistograms(
                  data.weekendWeekday.weekdayHist,
                  data.weekendWeekday.weekendHist,
                  data.weekendWeekday.weekday.count,
                  data.weekendWeekday.weekend.count
                )}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="binMid" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(0)} label={{ value: "Price (EUR/MWh)", position: "insideBottom", offset: -5, style: { fontSize: 10 } }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "Proportion", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: unknown, name?: unknown) => [(Number(v ?? 0) * 100).toFixed(2) + "%", String(name ?? "")]} labelFormatter={(v) => `€${Number(v).toFixed(0)}/MWh`} />
                <Bar dataKey="weekday" fill={COLORS.primary} fillOpacity={0.5} name="Weekday" radius={[2, 2, 0, 0]} />
                <Bar dataKey="weekend" fill={COLORS.orange} fillOpacity={0.5} name="Weekend" radius={[2, 2, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ExportableChart>
          <ExportableChart
            title="Mean Price by Hour: Weekday vs Weekend"
            filename="eda_BE_hourly_price_mean_by_hour_weekday_vs_weekend"
            edaRegister={{ key: "eda-ww-hour", order: 51 }}
          >
            <p className="text-xs text-zinc-400 mb-2">
              Average price at each hour of the day. Weekends typically show lower peaks and less volatility.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={data.weekendWeekday.weekdayByHour.map((wd, i) => ({
                  hour: wd.hour,
                  Weekday: wd.mean,
                  Weekend: data.weekendWeekday.weekendByHour[i]?.mean ?? 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}:00`} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(v) => `${v}:00`} />
                <Line type="monotone" dataKey="Weekday" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} name="Weekday" />
                <Line type="monotone" dataKey="Weekend" stroke={COLORS.orange} strokeWidth={2} dot={{ r: 3 }} name="Weekend" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </ExportableChart>
        </div>
      ))}

      {/* ────── 9. Correlation Analysis ────── */}
      {S("correlation", "Correlation Analysis", "Pearson correlations between key features", (
        <div className="space-y-6">
          <ExportableChart
            title="Correlation Matrix (Pearson)"
            filename="eda_BE_hourly_features_pearson_correlation_matrix"
            edaRegister={{ key: "eda-corr-matrix", order: 60 }}
          >
            <CorrelationMatrix features={data.correlations.features} matrix={data.correlations.matrix} />
          </ExportableChart>
          <ExportableChart
            title="Correlation with Prices (sorted by absolute r)"
            filename="eda_BE_hourly_features_correlation_with_BE_price_bars"
            edaRegister={{ key: "eda-corr-price-bars", order: 61 }}
          >
            <ResponsiveContainer width="100%" height={Math.max(250, data.correlations.withPrices.length * 22)}>
              <BarChart data={data.correlations.withPrices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} domain={[-1, 1]} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 9 }} width={150} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [Number(v).toFixed(3), "r"]} />
                <ReferenceLine x={0} stroke="#999" />
                <Bar dataKey="correlation" name="Correlation" radius={[0, 3, 3, 0]}>
                  {data.correlations.withPrices.map((entry, i) => (
                    <Cell key={i} fill={entry.correlation >= 0 ? COLORS.primary : COLORS.secondary} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ExportableChart>
          <div>
            <h4 className="text-xs font-medium text-zinc-600 mb-2">Scatter Plots vs Prices (top 4 correlated)</h4>
            <p className="text-xs text-zinc-400 mb-2">Axes use 2nd–98th percentile range to reduce outlier impact. Dashed line = linear regression trend.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.correlations.scatterVsPrices.map(({ feature, points }, scatterIdx) => {
                const xs = points.map((p) => p.x).filter((v) => !Number.isNaN(v));
                const ys = points.map((p) => p.y).filter((v) => !Number.isNaN(v));
                const xSorted = [...xs].sort((a, b) => a - b);
                const ySorted = [...ys].sort((a, b) => a - b);
                const xMin = percentile(xSorted, 0.02);
                const xMax = percentile(xSorted, 0.98);
                const yMin = percentile(ySorted, 0.02);
                const yMax = percentile(ySorted, 0.98);
                const { slope, intercept } = linearRegression(points);
                const trendY1 = slope * xMin + intercept;
                const trendY2 = slope * xMax + intercept;
                const featSlug = feature.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase() || "feature";
                return (
                  <ExportableChart
                    key={feature}
                    title={`${feature} vs BE Prices (scatter)`}
                    filename={`eda_BE_hourly_scatter_${featSlug}_vs_price_top_corr_${scatterIdx + 1}`}
                    edaRegister={{ key: `eda-corr-scatter-${featSlug}`, order: 150 + scatterIdx }}
                  >
                    <p className="text-xs text-zinc-500 mb-1">r = {data.correlations.withPrices.find((f) => f.feature === feature)?.correlation}</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="x" type="number" domain={[xMin, xMax]} tick={{ fontSize: 9 }} label={{ value: feature, position: "insideBottom", offset: -2, style: { fontSize: 9 } }} />
                        <YAxis dataKey="y" type="number" domain={[yMin, yMax]} tick={{ fontSize: 9 }} label={{ value: "Prices (EUR/MWh)", angle: -90, position: "insideLeft", style: { fontSize: 9 } }} />
                        <Tooltip contentStyle={{ fontSize: 10 }} />
                        <Scatter data={points} fill={COLORS.primary} fillOpacity={0.3} r={2} />
                        <ReferenceLine
                          segment={[
                            { x: xMin, y: trendY1 },
                            { x: xMax, y: trendY2 },
                          ]}
                          stroke={COLORS.secondary}
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </ExportableChart>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* ────── 10. Cross-border Prices ────── */}
      {S("crossborder", "Cross-border Price Comparison", "BE vs FR vs NL daily prices and spreads", (
        <div className="space-y-6">
          <ExportableChart
            title="Daily Average Prices: Belgium, France, Netherlands"
            filename="eda_BE_FR_NL_daily_average_day_ahead_price_EUR_per_MWh"
            edaRegister={{ key: "eda-xb-daily", order: 170 }}
          >
            <ZoomableTimeSeriesChart
              data={data.crossBorder.daily}
              xDataKey="date"
              height={300}
              formatXLabel={(v) => v.slice(5)}
              chartType="LineChart"
              margin={EDA_MARGIN_TOP_LEGEND}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} interval={Math.floor(data.crossBorder.daily.length / 10)} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line dataKey="BE" stroke={COLORS.primary} strokeWidth={1.5} dot={false} name="Belgium" />
              <Line dataKey="FR" stroke={COLORS.secondary} strokeWidth={1} dot={false} opacity={0.7} name="France" />
              <Line dataKey="NL" stroke={COLORS.tertiary} strokeWidth={1} dot={false} opacity={0.7} name="Netherlands" />
              <Legend {...EDA_LEGEND_TOP_PROPS} />
            </ZoomableTimeSeriesChart>
          </ExportableChart>
          <ExportableChart
            title="Price Spreads (BE minus neighbor)"
            filename="eda_BE_minus_FR_and_BE_minus_NL_daily_price_spread_EUR_per_MWh"
            edaRegister={{ key: "eda-xb-spreads", order: 171 }}
          >
            <ZoomableTimeSeriesChart
              data={data.crossBorder.spreads}
              xDataKey="date"
              height={250}
              formatXLabel={(v) => v.slice(5)}
              margin={EDA_MARGIN_TOP_LEGEND}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} interval={Math.floor(data.crossBorder.spreads.length / 10)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
              <Line dataKey="BE_FR" stroke={COLORS.secondary} strokeWidth={1} dot={false} name="BE - FR" opacity={0.7} />
              <Line dataKey="BE_NL" stroke={COLORS.tertiary} strokeWidth={1} dot={false} name="BE - NL" opacity={0.7} />
              <Legend {...EDA_LEGEND_TOP_PROPS} />
            </ZoomableTimeSeriesChart>
          </ExportableChart>
          <div>
            <h4 className="text-xs font-medium text-zinc-600 mb-2">Spread Statistics</h4>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-zinc-200 text-zinc-500">
                <th className="text-left py-1.5 px-2">Spread</th>
                <th className="text-right py-1.5 px-2">Mean</th>
                <th className="text-right py-1.5 px-2">Std</th>
                <th className="text-right py-1.5 px-2">Min</th>
                <th className="text-right py-1.5 px-2">Max</th>
                <th className="text-right py-1.5 px-2">% Positive</th>
              </tr></thead>
              <tbody>
                {data.crossBorder.spreadStats.map((s) => (
                  <tr key={s.name} className="border-b border-zinc-50">
                    <td className="py-1.5 px-2 font-medium">{s.name}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{s.mean}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{s.std}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{s.min}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{s.max}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{s.pctPositive}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ────── 11. Load Analysis ────── */}
      {S("load", "Load Analysis", "Forecast vs actual and imbalance distribution", (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExportableChart
              title="Load Forecast vs Actual (sampled)"
              filename="eda_BE_load_forecast_vs_actual_scatter_MW"
              edaRegister={{ key: "eda-load-fa-scatter", order: 180 }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="forecast"
                    type="number"
                    domain={(() => {
                      const vals = data.loadAnalysis.forecastVsActual;
                      const minV = Math.min(...vals.map((v) => Math.min(v.forecast, v.actual)));
                      const maxV = Math.max(...vals.map((v) => Math.max(v.forecast, v.actual)));
                      return [minV, maxV];
                    })()}
                    name="Forecast"
                    tick={{ fontSize: 10 }}
                    label={{ value: "BE Load Forecast (MW)", position: "insideBottom", offset: -2, style: { fontSize: 10 } }}
                  />
                  <YAxis
                    dataKey="actual"
                    type="number"
                    domain={(() => {
                      const vals = data.loadAnalysis.forecastVsActual;
                      const minV = Math.min(...vals.map((v) => Math.min(v.forecast, v.actual)));
                      const maxV = Math.max(...vals.map((v) => Math.max(v.forecast, v.actual)));
                      return [minV, maxV];
                    })()}
                    name="Actual"
                    tick={{ fontSize: 10 }}
                    label={{ value: "BE Load Actual (MW)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                  />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Scatter data={data.loadAnalysis.forecastVsActual} fill={COLORS.primary} fillOpacity={0.3} r={2} />
                  {(() => {
                    const vals = data.loadAnalysis.forecastVsActual;
                    const minV = Math.min(...vals.map((v) => Math.min(v.forecast, v.actual)));
                    const maxV = Math.max(...vals.map((v) => Math.max(v.forecast, v.actual)));
                    return <ReferenceLine segment={[{ x: minV, y: minV }, { x: maxV, y: maxV }]} stroke="#ef4444" strokeDasharray="4 4" />;
                  })()}
                </ScatterChart>
              </ResponsiveContainer>
            </ExportableChart>
            <ExportableChart
              title="Load Imbalance Distribution (Actual − Forecast)"
              filename="eda_BE_load_imbalance_actual_minus_forecast_histogram_MW"
              edaRegister={{ key: "eda-load-imbalance-hist", order: 181 }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.loadAnalysis.imbalanceHist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="binStart" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(0)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill={COLORS.purple} fillOpacity={0.6} name="Count" radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
            <h4 className="text-xs font-semibold text-zinc-600 mb-2">Imbalance Statistics</h4>
            <div className="flex flex-wrap gap-6 text-xs">
              <span><b>Mean:</b> {data.loadAnalysis.imbalanceStats.mean} MW</span>
              <span><b>Std:</b> {data.loadAnalysis.imbalanceStats.std} MW</span>
              <span><b>Min:</b> {data.loadAnalysis.imbalanceStats.min} MW</span>
              <span><b>Max:</b> {data.loadAnalysis.imbalanceStats.max} MW</span>
              <span><b>Skewness:</b> {data.loadAnalysis.imbalanceStats.skewness}</span>
              <span><b>Kurtosis:</b> {data.loadAnalysis.imbalanceStats.kurtosis}</span>
              {data.loadAnalysis.imbalanceStats.shapiroWilk && (
                <>
                  <span><b>Shapiro–Wilk W:</b> {data.loadAnalysis.imbalanceStats.shapiroWilk.W}</span>
                  <span>
                    <b>Shapiro–Wilk p:</b>{" "}
                    {data.loadAnalysis.imbalanceStats.shapiroWilk.pValue < 0.001
                      ? "< 0.001"
                      : data.loadAnalysis.imbalanceStats.shapiroWilk.pValue.toFixed(4)}
                  </span>
                  <span>
                    <b>Normality:</b>{" "}
                    {data.loadAnalysis.imbalanceStats.shapiroWilk.pValue < 0.05
                      ? "Rejected (p < 0.05)"
                      : "Not rejected (p ≥ 0.05)"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* ────── 12. Renewable Energy Forecasts ────── */}
      {S("renewables", "Renewable Energy Forecasts", "Weekly average wind and solar", (
        <ExportableChart
          title="Weekly Average Renewable Forecasts (Belgium)"
          filename="eda_BE_weekly_average_wind_and_solar_forecast_MW"
          edaRegister={{ key: "eda-renew-weekly", order: 182 }}
        >
          <ZoomableTimeSeriesChart
            data={data.renewables.weekly}
            xDataKey="week"
            height={300}
            margin={EDA_MARGIN_TOP_LEGEND_ANGL}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={Math.floor(data.renewables.weekly.length / 12)} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: "MW", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Area dataKey="solar" fill={COLORS.quaternary} fillOpacity={0.3} stroke={COLORS.quaternary} strokeWidth={1.5} name="Solar" />
            <Line dataKey="wind" stroke={COLORS.cyan} strokeWidth={2} dot={false} name="Wind" />
            <Legend {...EDA_LEGEND_TOP_PROPS} />
          </ZoomableTimeSeriesChart>
        </ExportableChart>
      ))}

      {/* ────── 13. Cross-border Flows ────── */}
      {S("flows", "Cross-border Flows", "Weekly average flows BE-NL, BE-FR, BE-DE", (
        <ExportableChart
          title="Weekly Average Cross-border Flows"
          filename="eda_BE_weekly_average_cross_border_flows_BE_NL_BE_FR_BE_DE_MW"
          edaRegister={{ key: "eda-flows-weekly", order: 183 }}
        >
          <ZoomableTimeSeriesChart
            data={data.crossBorderFlows.weekly}
            xDataKey="week"
            height={300}
            chartType="LineChart"
            margin={EDA_MARGIN_TOP_LEGEND_ANGL}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={Math.floor(data.crossBorderFlows.weekly.length / 12)} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: "MW", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
            <Line dataKey="BE_NL" stroke={COLORS.primary} strokeWidth={1.5} dot={false} name="BE-NL" />
            <Line dataKey="BE_FR" stroke={COLORS.secondary} strokeWidth={1.5} dot={false} name="BE-FR" />
            <Line dataKey="BE_DE" stroke={COLORS.tertiary} strokeWidth={1.5} dot={false} name="BE-DE" />
            <Legend {...EDA_LEGEND_TOP_PROPS} />
          </ZoomableTimeSeriesChart>
        </ExportableChart>
      ))}

      {/* ────── 14. Autocorrelation & Stationarity ────── */}
      {S("acf", "Autocorrelation & Stationarity", "ACF up to 168 lags (1 week) and price changes", (
        <div className="space-y-6">
          <ExportableChart
            title="Autocorrelation Function (Prices)"
            filename="eda_BE_hourly_price_ACF_up_to_168_lags_with_CI"
            edaRegister={{ key: "eda-acf-bars", order: 184 }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.autocorrelation.acf.slice(1)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="lag" tick={{ fontSize: 9 }} label={{ value: "Lag (hours)", position: "insideBottom", offset: -2, style: { fontSize: 10 } }} />
                <YAxis tick={{ fontSize: 10 }} domain={[-0.2, 1]} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <ReferenceLine y={data.autocorrelation.acf[1]?.ci ?? 0} stroke="#ef4444" strokeDasharray="4 4" />
                <ReferenceLine y={-(data.autocorrelation.acf[1]?.ci ?? 0)} stroke="#ef4444" strokeDasharray="4 4" />
                <ReferenceLine y={0} stroke="#999" />
                <Bar dataKey="value" name="ACF" radius={[1, 1, 0, 0]}>
                  {data.autocorrelation.acf.slice(1).map((entry, i) => (
                    <Cell key={i} fill={entry.lag === 24 || entry.lag === 48 || entry.lag === 168 ? COLORS.secondary : COLORS.primary} fillOpacity={0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-zinc-400 mt-1">Red bars highlight lags 24h, 48h, 168h (weekly). Red dashed lines = 95% confidence interval.</p>
          </ExportableChart>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExportableChart
              title="Hourly Price Changes Distribution"
              filename="eda_BE_hourly_price_first_difference_histogram_EUR_per_MWh"
              edaRegister={{ key: "eda-acf-dpchist", order: 185 }}
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.autocorrelation.priceChangesHist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="binStart" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(0)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="3 3" />
                  <Bar dataKey="count" fill={COLORS.cyan} fillOpacity={0.6} name="Count" radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ExportableChart>
            <div className="flex flex-col justify-center">
              <h4 className="text-xs font-medium text-zinc-600 mb-3">Price Change Statistics</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-zinc-50 p-2 rounded"><span className="text-zinc-500">Mean change</span><span className="font-mono">{data.autocorrelation.priceChangeStats.mean} EUR/MWh</span></div>
                <div className="flex justify-between bg-zinc-50 p-2 rounded"><span className="text-zinc-500">Std deviation</span><span className="font-mono">{data.autocorrelation.priceChangeStats.std} EUR/MWh</span></div>
                <div className="flex justify-between bg-zinc-50 p-2 rounded"><span className="text-zinc-500">Skewness</span><span className="font-mono">{data.autocorrelation.priceChangeStats.skewness}</span></div>
                <div className="flex justify-between bg-zinc-50 p-2 rounded"><span className="text-zinc-500">Excess kurtosis</span><span className="font-mono">{data.autocorrelation.priceChangeStats.kurtosis}</span></div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ────── 15. Feature Distributions ────── */}
      {S("features", "Feature Distributions", `Histograms for ${data.featureDistributions.length} key features`, (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.featureDistributions.map(({ feature, histogram: hist, mean: m, std: s }, fi) => {
            const fslug = feature.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase() || "feature";
            return (
              <ExportableChart
                key={feature}
                title={`${feature} (histogram)`}
                filename={`eda_BE_hourly_feature_histogram_${fslug}_mean_${m}_std_${s}`}
                edaRegister={{ key: `eda-feat-${fslug}`, order: 300 + fi }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-700 truncate">{feature}</span>
                  <span className="text-[10px] text-zinc-400 ml-1 shrink-0">m={m} s={s}</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={hist} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <XAxis dataKey="binStart" tick={false} />
                    <YAxis tick={false} width={0} />
                    <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v) => [v, "Count"]} labelFormatter={(v) => `${Number(v).toFixed(1)}`} />
                    <Bar dataKey="count" fill={COLORS.primary} fillOpacity={0.5} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ExportableChart>
            );
          })}
        </div>
      ))}

      {/* ────── 16. Outlier Analysis ────── */}
      {S("outliers", "Outlier Analysis", "Standardized box plots for all features", (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">Features standardized to zero mean and unit variance. Outliers defined as values beyond 1.5x IQR from Q1/Q3.</p>
          <ExportableChart
            title="Outlier Analysis Table (standardized features)"
            filename="eda_BE_hourly_features_outlier_summary_table_with_mini_boxplots"
            edaRegister={{ key: "eda-outliers-table", order: 900 }}
          >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="text-left py-1.5 px-2 font-medium">Feature</th>
                  <th className="text-right py-1.5 px-2 font-medium">Q1</th>
                  <th className="text-right py-1.5 px-2 font-medium">Median</th>
                  <th className="text-right py-1.5 px-2 font-medium">Q3</th>
                  <th className="text-right py-1.5 px-2 font-medium">Whisker Low</th>
                  <th className="text-right py-1.5 px-2 font-medium">Whisker High</th>
                  <th className="text-right py-1.5 px-2 font-medium">Outliers</th>
                  <th className="text-right py-1.5 px-2 font-medium">% Outliers</th>
                  <th className="text-left py-1.5 px-2 font-medium w-48">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.outlierAnalysis.boxPlots.map((bp, i) => (
                  <tr key={bp.feature} className={i % 2 === 0 ? "bg-zinc-50/50" : ""}>
                    <td className="py-1.5 px-2 font-medium text-zinc-700">{bp.feature}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{bp.q1}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{bp.median}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{bp.q3}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{bp.whiskerLow}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{bp.whiskerHigh}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{bp.outlierCount}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{((bp.outlierCount / bp.totalCount) * 100).toFixed(1)}%</td>
                    <td className="py-1.5 px-2">
                      <MiniBoxPlot q1={bp.q1} median={bp.median} q3={bp.q3} whiskerLow={bp.whiskerLow} whiskerHigh={bp.whiskerHigh} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </ExportableChart>
        </div>
      ))}

      {/* ────── 17. Pair Plot ────── */}
      {S("pairplot", "Pair Plot (Key Features)", `Scatter matrix for ${data.pairPlot.features.length} features`, (
        <ExportableChart
          title={`Pair plot (key features, ${data.pairPlot.features.length}×${data.pairPlot.features.length})`}
          filename="eda_BE_hourly_key_features_pair_plot_scatter_matrix_sampled"
          edaRegister={{ key: "eda-pairplot", order: 910 }}
        >
          <p className="text-xs text-zinc-500 mb-3">Scatter plots between key features (300 sampled points, 2nd–98th percentile domain to reduce outlier impact)</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${data.pairPlot.features.length}, 1fr)` }}>
            {data.pairPlot.features.flatMap((fy, yi) =>
              data.pairPlot.features.map((fx, xi) => {
                if (xi === yi) {
                  return (
                    <div key={`${fx}-${fy}`} className="bg-zinc-100 rounded flex items-center justify-center p-1">
                      <span className="text-[9px] font-medium text-zinc-600 text-center leading-tight">{fx.replace(/_/g, " ")}</span>
                    </div>
                  );
                }
                {(() => {
                  const PRICE_FEATURES = ["Prices", "FR_Prices", "NL_Prices"];
                  const xVals = data.pairPlot.data.map((d) => Number(d[fx])).filter((v) => !Number.isNaN(v));
                  const yVals = data.pairPlot.data.map((d) => Number(d[fy])).filter((v) => !Number.isNaN(v));
                  const p = (arr: number[], q: number) => {
                    if (arr.length === 0) return 0;
                    const sorted = [...arr].sort((a, b) => a - b);
                    const idx = (q / 100) * (sorted.length - 1);
                    const lo = Math.floor(idx);
                    const hi = Math.ceil(idx);
                    return lo === hi ? sorted[lo] : sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
                  };
                  const xLo = p(xVals, 2);
                  const xHi = p(xVals, 98);
                  const yLo = p(yVals, 2);
                  const yHi = p(yVals, 98);
                  const useSameScale = PRICE_FEATURES.includes(fx) && PRICE_FEATURES.includes(fy);
                  const lo = useSameScale ? Math.min(xLo, yLo) : xLo;
                  const hi = useSameScale ? Math.max(xHi, yHi) : xHi;
                  const xDomain = xLo === xHi ? [xLo - 0.5, xHi + 0.5] : [lo, hi];
                  const yDomain = yLo === yHi ? [yLo - 0.5, yHi + 0.5] : (useSameScale ? [lo, hi] : [yLo, yHi]);
                  return (
                    <div key={`${fx}-${fy}`} className="border border-zinc-100 rounded overflow-hidden">
                      <ResponsiveContainer width="100%" height={80}>
                        <ScatterChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <XAxis dataKey={fx} type="number" domain={xDomain} tick={false} />
                          <YAxis dataKey={fy} type="number" domain={yDomain} tick={false} width={0} />
                          <Scatter data={data.pairPlot.data} fill={COLORS.primary} fillOpacity={0.3} r={2} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              })
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.pairPlot.features.map((f) => (
              <span key={f} className="text-[10px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600">{f}</span>
            ))}
          </div>
        </ExportableChart>
      ))}

      {/* ────── 18. Volatility Analysis ────── */}
      {S("volatility", "Volatility Analysis", "14-day rolling volatility and monthly patterns", (
        <div className="space-y-6">
          <ExportableChart
            title="14-Day Rolling Volatility (std dev of daily returns) vs price"
            filename="eda_BE_hourly_price_14d_rolling_volatility_and_daily_average_price"
            edaRegister={{ key: "eda-vol-daily", order: 920 }}
          >
            <ZoomableTimeSeriesChart
              data={data.volatility.daily}
              xDataKey="date"
              height={280}
              formatXLabel={(v) => v.slice(5)}
              margin={EDA_MARGIN_TOP_LEGEND}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v.slice(5)} interval={Math.floor(data.volatility.daily.length / 10)} />
              <YAxis yAxisId="vol" tick={{ fontSize: 10 }} label={{ value: "Volatility", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <YAxis yAxisId="price" orientation="right" tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: 90, position: "insideRight", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line yAxisId="price" dataKey="price" stroke={COLORS.primary} strokeWidth={1} dot={false} opacity={0.3} name="Avg Price" />
              <Area yAxisId="vol" dataKey="volatility" fill={COLORS.secondary} fillOpacity={0.15} stroke={COLORS.secondary} strokeWidth={1.5} name="Volatility" />
              <Legend {...EDA_LEGEND_TOP_PROPS} />
            </ZoomableTimeSeriesChart>
          </ExportableChart>
          <ExportableChart
            title="Monthly Volatility"
            filename="eda_BE_hourly_price_monthly_volatility_std_of_daily_returns"
            edaRegister={{ key: "eda-vol-monthly", order: 921 }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.volatility.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="volatility" fill={COLORS.secondary} fillOpacity={0.6} name="Volatility (Std)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ExportableChart>
        </div>
      ))}

      {/* ────── 19. Year-over-Year ────── */}
      {S("yoy", "Year-over-Year Comparison", `${data.yearOverYear.years.filter((y) => y !== 2026).join(", ")}`, (
        <ExportableChart
          title="Monthly Average Prices by Year"
          filename="eda_BE_hourly_price_monthly_average_by_year_grouped_bars_EUR_per_MWh"
          edaRegister={{ key: "eda-yoy-monthly", order: 930 }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.yearOverYear.monthlyByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monthName" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              {data.yearOverYear.years
                .filter((year) => year !== 2026)
                .map((year, i) => (
                  <Bar key={year} dataKey={(entry: EDAResult["yearOverYear"]["monthlyByYear"][0]) => entry.values.find(v => v.year === year)?.avg ?? 0} name={String(year)} fill={Object.values(COLORS)[i % Object.values(COLORS).length]} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </ExportableChart>
      ))}

    </div>
  );
}

// ──────────────────── Sub-components ────────────────────

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function mergeHistograms(
  a: { binStart: number; binEnd: number; count: number }[],
  b: { binStart: number; binEnd: number; count: number }[],
  totalA: number,
  totalB: number
): { binStart: number; binMid: number; weekday: number; weekend: number }[] {
  return a.map((item, i) => ({
    binStart: item.binStart,
    binMid: (item.binStart + item.binEnd) / 2,
    weekday: totalA > 0 ? item.count / totalA : 0,
    weekend: totalB > 0 ? (b[i]?.count ?? 0) / totalB : 0,
  }));
}

function HeatmapGrid({
  data,
  rowKey,
  colKey,
  rowLabel,
  colLabel,
  rows,
  cols,
  colOffset = 0,
}: {
  data: { value: number; [key: string]: number | string }[];
  rowKey: string;
  colKey: string;
  rowLabel: (v: number) => string;
  colLabel: (v: number) => string;
  rows: number;
  cols: number;
  colOffset?: number;
}) {
  const values = data.map((d) => d.value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const lookup = new Map<string, number>();
  for (const d of data) {
    lookup.set(`${d[rowKey]}-${d[colKey]}`, d.value as number);
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex">
          <div className="w-12" />
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="w-14 text-center text-[10px] text-zinc-500 font-medium pb-1">
              {colLabel(c + colOffset)}
            </div>
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex">
            <div className="w-12 text-right pr-2 text-[10px] text-zinc-500 leading-5">{rowLabel(r)}</div>
            {Array.from({ length: cols }, (_, c) => {
              const val = lookup.get(`${r}-${c + colOffset}`) ?? 0;
              return (
                <div
                  key={c}
                  className="w-14 h-5 flex items-center justify-center text-[9px] font-mono border border-white/50"
                  style={{ backgroundColor: heatColor(val, min, max), color: val > (min + max) / 2 ? "white" : "#333" }}
                  title={`${rowLabel(r)} x ${colLabel(c + colOffset)}: ${val} EUR/MWh`}
                >
                  {val.toFixed(0)}
                </div>
              );
            })}
          </div>
        ))}
        {/* Color legend */}
        <div className="flex items-center gap-2 mt-2 ml-12">
          <span className="text-[10px] text-zinc-500">{min.toFixed(0)}</span>
          <div className="flex h-3 flex-1 max-w-xs rounded overflow-hidden">
            {Array.from({ length: 20 }, (_, i) => {
              const v = min + (i / 19) * (max - min);
              return <div key={i} className="flex-1" style={{ backgroundColor: heatColor(v, min, max) }} />;
            })}
          </div>
          <span className="text-[10px] text-zinc-500">{max.toFixed(0)} EUR/MWh</span>
        </div>
      </div>
    </div>
  );
}

function CorrelationMatrix({ features, matrix }: { features: string[]; matrix: number[][] }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex">
          <div className="w-36" />
          {features.map((f) => (
            <div key={f} className="w-10 text-center flex items-end justify-center" style={{ height: 80 }}>
              <span className="text-[8px] text-zinc-500 whitespace-nowrap" style={{ transform: "rotate(45deg)", transformOrigin: "bottom center" }}>
                {f.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
        {features.map((f, i) => (
          <div key={f} className="flex">
            <div className="w-36 text-right pr-2 text-[9px] text-zinc-600 leading-[18px] truncate">{f.replace(/_/g, " ")}</div>
            {matrix[i].map((v, j) => (
              <div
                key={j}
                className="w-10 h-[18px] flex items-center justify-center text-[8px] font-mono border border-white/30"
                style={{ backgroundColor: corrColor(v), color: Math.abs(v) > 0.5 ? "white" : "#333" }}
                title={`${features[i]} vs ${features[j]}: ${v.toFixed(3)}`}
              >
                {i === j ? "" : v.toFixed(1)}
              </div>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2 ml-36">
          <span className="text-[10px] text-zinc-500">-1</span>
          <div className="flex h-3 flex-1 max-w-xs rounded overflow-hidden">
            {Array.from({ length: 20 }, (_, i) => {
              const v = -1 + (i / 19) * 2;
              return <div key={i} className="flex-1" style={{ backgroundColor: corrColor(v) }} />;
            })}
          </div>
          <span className="text-[10px] text-zinc-500">+1</span>
        </div>
      </div>
    </div>
  );
}

function MiniBoxPlot({ q1, median, q3, whiskerLow, whiskerHigh }: { q1: number; median: number; q3: number; whiskerLow: number; whiskerHigh: number }) {
  const min = Math.min(whiskerLow, -3);
  const max = Math.max(whiskerHigh, 3);
  const range = max - min || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));

  return (
    <div className="relative h-4 w-full">
      <div className="absolute top-1.5 h-px bg-zinc-300" style={{ left: `${pct(whiskerLow)}%`, right: `${100 - pct(whiskerHigh)}%` }} />
      <div className="absolute top-0.5 h-3 bg-blue-100 border border-blue-400 rounded-sm" style={{ left: `${pct(q1)}%`, width: `${pct(q3) - pct(q1)}%` }} />
      <div className="absolute top-0.5 h-3 w-px bg-red-500" style={{ left: `${pct(median)}%` }} />
      <div className="absolute top-0.5 w-px h-3 bg-zinc-400" style={{ left: `${pct(whiskerLow)}%` }} />
      <div className="absolute top-0.5 w-px h-3 bg-zinc-400" style={{ left: `${pct(whiskerHigh)}%` }} />
      <div className="absolute top-1.5 w-1 h-px bg-zinc-400" style={{ left: `${pct(0)}%` }} />
    </div>
  );
}
