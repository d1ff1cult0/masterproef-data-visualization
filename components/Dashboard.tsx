"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MetricsView from "./MetricsView";
import PredictionsChart from "./PredictionsChart";
import StatusUpdateView from "./StatusUpdateView";
import BestModelsLanding from "./BestModelsLanding";
import EDAView from "./EDAView";
import type { SelectedModel } from "@/lib/types";

type Tab = "eda" | "metrics" | "predictions" | "status-updates";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "eda",
    label: "Data Analysis",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
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
          <a
            href="https://github.com/d1ff1cult0/electricity-price-forecasting"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            title="View on GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
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
        {activeTab === "eda" ? (
          <main className="flex-1 overflow-y-auto bg-zinc-50/50">
            <EDAView />
          </main>
        ) : activeTab === "status-updates" ? (
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
                <BestModelsLanding
                  onCompareInDashboard={(models) => {
                    setSelectedModels(models);
                    setActiveTab("metrics");
                  }}
                />
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
