"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ModelKey, DataPoint } from "@/lib/extreme-events";
import { computeRegimeMetrics } from "@/lib/analysis";
import { ExportableChart } from "./ExportableChart";

interface Props {
  data: DataPoint[];
  modelKeys: ModelKey[];
}

export default function RegimeBreakdown({ data, modelKeys }: Props) {
  const { rows, p10, p90 } = useMemo(
    () => computeRegimeMetrics(data, modelKeys),
    [data, modelKeys]
  );

  if (modelKeys.length === 0) return null;

  // chart data: regime on X, one bar per model showing MAE
  const chartData = rows.map((r) => {
    const d: Record<string, string | number> = { regime: r.regime };
    for (const { label } of modelKeys) {
      d[label] = r[`${label}_mae`] as number;
    }
    return d;
  });

  const METRICS = ["mae", "rmse", "crps"] as const;
  const METRIC_LABELS: Record<string, string> = {
    mae: "MAE",
    rmse: "RMSE",
    crps: "CRPS",
  };

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">
          Regime Breakdown
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Performance split by price regime. Thresholds based on daily mean
          price percentiles: p10 = {p10.toFixed(1)} EUR/MWh, p90 ={" "}
          {p90.toFixed(1)} EUR/MWh.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <ExportableChart title="Regime MAE Breakdown" filename="regime-breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="regime" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: "MAE (EUR/MWh)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fontSize: 11,
                  fill: "#71717a",
                }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value) => Number(value).toFixed(2)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {modelKeys.map(({ label, color }) => (
                <Bar
                  key={label}
                  dataKey={label}
                  fill={color}
                  isAnimationActive={false}
                  name={label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ExportableChart>

        {/* Detailed table with MAE / RMSE / CRPS per regime */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                  Regime
                </th>
                <th className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700">
                  N
                </th>
                {modelKeys.map(({ label, color }) =>
                  METRICS.map((m) => (
                    <th
                      key={`${label}_${m}`}
                      className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700"
                    >
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: color }}
                        />
                        {METRIC_LABELS[m]}
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.regime}
                  className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                >
                  <td className="border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700">
                    {row.regime}
                  </td>
                  <td className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-500">
                    {row.n}
                  </td>
                  {modelKeys.map(({ label }) =>
                    METRICS.map((m) => {
                      const v = row[`${label}_${m}`] as number;
                      return (
                        <td
                          key={`${label}_${m}`}
                          className="border border-zinc-200 px-3 py-1.5 text-right tabular-nums text-zinc-600"
                        >
                          {v != null && !isNaN(v) ? v.toFixed(2) : "—"}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
