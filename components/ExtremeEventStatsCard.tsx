"use client";

import type { ExtremeEventStats } from "@/lib/extreme-events";

interface ExtremeEventStatsCardProps {
  stats: ExtremeEventStats;
}

export default function ExtremeEventStatsCard({ stats }: ExtremeEventStatsCardProps) {
  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-100">
        <h3 className="text-sm font-medium text-zinc-800">
          Extreme Event Performance
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Metrics on top 10% (spikes) and bottom 10% (lows) of actual prices. MAE ratio = MAE in extreme period / MAE overall (higher = worse at extremes).
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-zinc-100 p-3 bg-zinc-50/50">
          <h4 className="text-xs font-semibold text-zinc-600 mb-2">Negative Price Frequency</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-zinc-500">Actual (observed):</span>{" "}
              <span className="font-mono font-medium">{stats.pctNegativeActual.toFixed(1)}%</span>
              <span className="text-zinc-400 ml-1">negative</span>
            </div>
            {stats.modelStats.map((m) => (
              <div key={m.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-zinc-600">{m.label}:</span>
                <span className="font-mono font-medium">{m.pctNegativePred.toFixed(1)}%</span>
                <span className="text-zinc-400">predicted negative</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-zinc-600 mb-2">
            Top 10% (highest prices, n={stats.top10Count})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-200">
                  <th className="text-left py-1.5 px-2 font-medium">Model</th>
                  <th className="text-right py-1.5 px-2 font-medium">MAE</th>
                  <th className="text-right py-1.5 px-2 font-medium">RMSE</th>
                  <th className="text-right py-1.5 px-2 font-medium">MPIW</th>
                  <th className="text-right py-1.5 px-2 font-medium">Interval Score</th>
                  <th className="text-right py-1.5 px-2 font-medium">CRPS</th>
                  <th className="text-right py-1.5 px-2 font-medium">PICP %</th>
                  <th className="text-right py-1.5 px-2 font-medium">MAE ratio</th>
                </tr>
              </thead>
              <tbody>
                {stats.modelStats.map((m) => (
                  <tr key={m.label} className="border-b border-zinc-50">
                    <td className="py-1.5 px-2">
                      <span className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.mae != null ? m.top10.mae.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.rmse != null ? m.top10.rmse.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.mpiw != null ? m.top10.mpiw.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.intervalScore != null ? m.top10.intervalScore.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.crps != null ? m.top10.crps.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.picp.toFixed(1)}%</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.top10.maeRatio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-zinc-600 mb-2">
            Bottom 10% (lowest prices, n={stats.bottom10Count})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-200">
                  <th className="text-left py-1.5 px-2 font-medium">Model</th>
                  <th className="text-right py-1.5 px-2 font-medium">MAE</th>
                  <th className="text-right py-1.5 px-2 font-medium">RMSE</th>
                  <th className="text-right py-1.5 px-2 font-medium">MPIW</th>
                  <th className="text-right py-1.5 px-2 font-medium">Interval Score</th>
                  <th className="text-right py-1.5 px-2 font-medium">CRPS</th>
                  <th className="text-right py-1.5 px-2 font-medium">PICP %</th>
                  <th className="text-right py-1.5 px-2 font-medium">MAE ratio</th>
                </tr>
              </thead>
              <tbody>
                {stats.modelStats.map((m) => (
                  <tr key={m.label} className="border-b border-zinc-50">
                    <td className="py-1.5 px-2">
                      <span className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.mae != null ? m.bottom10.mae.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.rmse != null ? m.bottom10.rmse.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.mpiw != null ? m.bottom10.mpiw.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.intervalScore != null ? m.bottom10.intervalScore.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.crps != null ? m.bottom10.crps.toFixed(2) : "—"}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.picp.toFixed(1)}%</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{m.bottom10.maeRatio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
