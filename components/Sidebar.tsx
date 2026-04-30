"use client";

import { useEffect, useState, useMemo } from "react";
import type { Experiment, SelectedModel } from "@/lib/types";
import {
  MODEL_COLORS,
  compareExperimentsByNotebook,
  getExperimentNotebookBadge,
} from "@/lib/types";

interface SidebarProps {
  selectedModels: SelectedModel[];
  onSelectionChange: (models: SelectedModel[]) => void;
  /** Shown in the panel header (e.g. close drawer on mobile) */
  onClose?: () => void;
  className?: string;
}

export default function Sidebar({
  selectedModels,
  onSelectionChange,
  onClose,
  className,
}: SidebarProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/experiments")
      .then((r) => r.json())
      .then((data) => {
        setExperiments(data.experiments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sortedExperiments = useMemo(() => {
    return [...experiments].sort((a, b) => {
      const c = compareExperimentsByNotebook(a.name, b.name);
      if (c !== 0) return c;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [experiments]);

  const isSelected = (experiment: string, model: string) =>
    selectedModels.some((m) => m.experiment === experiment && m.model === model);

  const toggleModel = (experiment: string, model: string) => {
    if (isSelected(experiment, model)) {
      onSelectionChange(
        selectedModels.filter((m) => !(m.experiment === experiment && m.model === model))
      );
    } else {
      const nextColor = MODEL_COLORS[selectedModels.length % MODEL_COLORS.length];
      onSelectionChange([
        ...selectedModels,
        { experiment, model, run: "average", color: nextColor },
      ]);
    }
  };

  const updateRun = (experiment: string, model: string, run: string) => {
    onSelectionChange(
      selectedModels.map((m) =>
        m.experiment === experiment && m.model === model ? { ...m, run } : m
      )
    );
  };

  const getRunOptions = (experiment: string, modelName: string): number => {
    const exp = experiments.find((e) => e.name === experiment);
    return exp?.models.find((m) => m.name === modelName)?.runs ?? 0;
  };

  const formatModelName = (name: string) =>
    name.replace(/_/g, " ").replace(/\(([^)]+)\)/g, "($1)");

  return (
    <aside
      className={`w-72 max-w-[min(18rem,90vw)] shrink-0 border-r border-zinc-200 bg-white flex flex-col overflow-hidden h-full min-h-0 lg:max-w-none ${className ?? ""}`}
    >
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2 min-h-11">
        <h2
          id={onClose ? "experiments-panel-title" : undefined}
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider"
        >
          Experiments
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
            aria-label="Close experiments panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="text-xs text-zinc-400 p-3 text-center">Loading...</div>
        ) : sortedExperiments.length === 0 ? (
          <div className="text-xs text-zinc-400 p-3 text-center">No experiments found</div>
        ) : (
          sortedExperiments.map((exp) => {
            const notebookBadge = getExperimentNotebookBadge(exp.name);
            return (
              <div key={exp.name}>
                <button
                  type="button"
                  title={exp.name}
                  onClick={() => setExpandedExp(expandedExp === exp.name ? null : exp.name)}
                  className="w-full text-left px-2.5 py-2 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                >
                  <svg
                    className={`w-3 h-3 shrink-0 text-zinc-400 transition-transform ${expandedExp === exp.name ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {notebookBadge != null && (
                    <span className="shrink-0 min-h-5 min-w-5 max-w-[3.25rem] rounded bg-zinc-100 text-zinc-500 flex items-center justify-center px-0.5 text-[9px] font-semibold leading-tight tabular-nums">
                      {notebookBadge}
                    </span>
                  )}
                  <span className="truncate">{exp.displayName}</span>
                </button>

                {expandedExp === exp.name && (
                  <div className="ml-5 pl-2.5 mt-0.5 space-y-0.5 border-l border-zinc-100">
                    {exp.models.map((model) => {
                      const selected = isSelected(exp.name, model.name);
                      const selModel = selectedModels.find(
                        (m) => m.experiment === exp.name && m.model === model.name
                      );

                      return (
                        <div key={model.name} className="space-y-0.5">
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-zinc-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleModel(exp.name, model.name)}
                              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 h-3 w-3"
                            />
                            <span
                              className="truncate text-zinc-600"
                              title={formatModelName(model.name)}
                            >
                              {formatModelName(model.name)}
                            </span>
                            {selected && selModel && (
                              <span
                                className="ml-auto w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: selModel.color }}
                              />
                            )}
                          </label>

                          {selected && (
                            <div className="ml-5 pb-1">
                              <select
                                value={selModel?.run ?? "average"}
                                onChange={(e) =>
                                  updateRun(exp.name, model.name, e.target.value)
                                }
                                className="w-full text-xs bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-600"
                              >
                                <option value="average">Average (all runs)</option>
                                {Array.from(
                                  { length: getRunOptions(exp.name, model.name) },
                                  (_, i) => (
                                    <option key={i} value={String(i)}>
                                      Run {i}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedModels.length > 0 && (
        <div className="border-t border-zinc-200 p-3 bg-zinc-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-600">
              {selectedModels.length} selected
            </span>
            <button
              onClick={() => onSelectionChange([])}
              className="text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {selectedModels.map((m) => {
              const notebookBadge = getExperimentNotebookBadge(m.experiment);
              return (
                <div
                  key={`${m.experiment}/${m.model}`}
                  className="flex items-center gap-1.5 text-xs text-zinc-500"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="truncate">{formatModelName(m.model)}</span>
                  <span className="text-zinc-400 ml-auto shrink-0 flex items-center gap-1">
                    {notebookBadge != null && (
                      <span className="text-zinc-300 tabular-nums">{notebookBadge}</span>
                    )}
                    <span>{m.run === "average" ? "avg" : `#${m.run}`}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
