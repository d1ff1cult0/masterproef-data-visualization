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
import { computePerHourMAE } from "@/lib/analysis";
import { ExportableChart } from "./ExportableChart";

interface Props {
  data: DataPoint[];
  modelKeys: ModelKey[];
}

export default function PerHourErrorAnalysis({ data, modelKeys }: Props) {
  const perHourData = useMemo(
    () => computePerHourMAE(data, modelKeys),
    [data, modelKeys]
  );

  if (modelKeys.length === 0) return null;

  // find best (lowest) MAE per hour for highlighting
  const bestPerHour = perHourData.map((row) => {
    let best = Infinity;
    let bestLabel = "";
    for (const { label } of modelKeys) {
      const v = row[label] as number;
      if (v < best) {
        best = v;
        bestLabel = label;
      }
    }
    return bestLabel;
  });

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">
          Per-Hour Error Analysis
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          MAE broken down by forecast hour (0-23). Shows whether prediction
          accuracy degrades for later hours in the 24h forecast horizon.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <ExportableChart title="Per-Hour MAE" filename="per-hour-mae">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={perHourData}
              margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Hour of day",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                  fill: "#71717a",
                }}
              />
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                  Hour
                </th>
                {modelKeys.map(({ label, color }) => (
                  <th
                    key={label}
                    className="border border-zinc-200 px-3 py-2 text-right font-semibold text-zinc-700"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: color }}
                      />
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perHourData.map((row, i) => (
                <tr key={row.hour} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                  <td className="border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 tabular-nums">
                    {String(row.hour).padStart(2, "0")}:00
                  </td>
                  {modelKeys.map(({ label }) => {
                    const v = row[label] as number;
                    const isBest = bestPerHour[i] === label;
                    return (
                      <td
                        key={label}
                        className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                          isBest
                            ? "font-semibold text-emerald-600"
                            : "text-zinc-600"
                        }`}
                      >
                        {v.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
