"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MetricsView from "./MetricsView";
import PredictionsChart from "./PredictionsChart";
import StatusUpdateView from "./StatusUpdateView";
import type { SelectedModel } from "@/lib/types";

type Tab = "metrics" | "predictions" | "status-updates";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "metrics",
    label: "Metrics",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: "predictions",
    label: "Predictions",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    id: "status-updates",
    label: "Status Updates",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("metrics");
  const [selectedStatusUpdateId, setSelectedStatusUpdateId] = useState<string | null>(null);

  const showSidebar = activeTab !== "status-updates" || selectedStatusUpdateId !== null;
  const hasModels = selectedModels.length > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold tracking-tight text-zinc-900">
              Master Thesis: EPF Results Dashboard
            </h1>
            <span className="text-xs text-zinc-400 hidden sm:inline">
              - Jarne Plessers
            </span>
          </div>
        </div>
        <nav className="flex px-6 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === "status-updates" ? (
          <StatusUpdateView
            selectedUpdateId={selectedStatusUpdateId}
            onSelectUpdate={setSelectedStatusUpdateId}
          />
        ) : (
          <>
            <Sidebar
              selectedModels={selectedModels}
              onSelectionChange={setSelectedModels}
            />
            <main className="flex-1 overflow-y-auto bg-zinc-50/50">
              {!hasModels ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-zinc-400">
                    Select models from the sidebar to compare
                  </p>
                </div>
              ) : activeTab === "metrics" ? (
                <MetricsView selectedModels={selectedModels} />
              ) : (
                <PredictionsChart selectedModels={selectedModels} />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
