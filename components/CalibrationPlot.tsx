"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ModelKey, DataPoint } from "@/lib/extreme-events";
import { computeCalibration } from "@/lib/analysis";
import { ExportableChart } from "./ExportableChart";

interface Props {
  data: DataPoint[];
  modelKeys: ModelKey[];
}

export default function CalibrationPlot({ data, modelKeys }: Props) {
  const calibrationData = useMemo(
    () => computeCalibration(data, modelKeys),
    [data, modelKeys]
  );

  if (modelKeys.length === 0) return null;

  // check if any model has valid calibration data (not all NaN)
  const hasQuantileData = calibrationData.some((row) =>
    modelKeys.some(({ label }) => {
      const v = row[label] as number;
      return !isNaN(v);
    })
  );

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">
          Calibration Plot (Reliability Diagram)
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Compares nominal quantile levels to observed coverage. Points above the
          diagonal indicate over-coverage (intervals too wide), below indicates
          under-coverage (intervals too narrow).
        </p>
      </div>

      <div className="p-4 space-y-4">
        {!hasQuantileData ? (
          <p className="text-sm text-zinc-500">
            No quantile predictions available for the selected models.
          </p>
        ) : (
          <>
            <ExportableChart
              title="Calibration Plot"
              filename="calibration-plot"
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={calibrationData}
                  margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="nominal"
                    type="number"
                    domain={[0, 1]}
                    ticks={[0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                    label={{
                      value: "Nominal Level",
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 11,
                      fill: "#71717a",
                    }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 1]}
                    ticks={[0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                    label={{
                      value: "Observed Coverage",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fontSize: 11,
                      fill: "#71717a",
                    }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value) => {
                      const v = Number(value);
                      return isNaN(v) ? "N/A" : v.toFixed(3);
                    }}
                    labelFormatter={(label) =>
                      `Nominal: ${Number(label).toFixed(3)}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {/* Diagonal reference line */}
                  <Line
                    dataKey="perfect"
                    stroke="#a1a1aa"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    name="Perfect"
                  />
                  {modelKeys.map(({ label, color }) => (
                    <Line
                      key={label}
                      dataKey={label}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color }}
                      isAnimationActive={false}
                      name={label}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ExportableChart>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50">
                    <th className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-700">
                      Nominal
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
                  {calibrationData
                    .filter(
                      (row) => row.nominal > 0 && row.nominal < 1
                    )
                    .map((row, i) => (
                      <tr
                        key={row.nominal}
                        className={
                          i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"
                        }
                      >
                        <td className="border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 tabular-nums">
                          {row.nominal.toFixed(3)}
                        </td>
                        {modelKeys.map(({ label }) => {
                          const v = row[label] as number;
                          const deviation = Math.abs(v - row.nominal);
                          const isGood = !isNaN(v) && deviation <= 0.05;
                          const isBad = !isNaN(v) && deviation > 0.05;
                          return (
                            <td
                              key={label}
                              className={`border border-zinc-200 px-3 py-1.5 text-right tabular-nums ${
                                isGood
                                  ? "text-emerald-600 font-semibold"
                                  : isBad
                                  ? "text-amber-600"
                                  : "text-zinc-600"
                              }`}
                            >
                              {isNaN(v) ? "N/A" : v.toFixed(3)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
