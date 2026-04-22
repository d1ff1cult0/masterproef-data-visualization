"use client";

interface CompareModelsContextBannerProps {
  onShowMethodologyOverview: () => void;
}

export default function CompareModelsContextBanner({
  onShowMethodologyOverview,
}: CompareModelsContextBannerProps) {
  return (
    <div className="shrink-0 border-b border-sky-100 bg-sky-50/95 px-3 py-2.5 sm:px-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">Same models, three ways to look at them</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            <strong>Metrics</strong>, <strong>Predictions</strong>, and <strong>Analysis</strong> only change the charts.
            They all use the same selected runs. The write-up on how every experiment was set up (data split, training
            details) is the <strong>Experiment Methodology</strong> section on the overview you see when no models are
            selected.
          </p>
        </div>
        <button
          type="button"
          onClick={onShowMethodologyOverview}
          className="shrink-0 self-start rounded-md border border-sky-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-sky-950 shadow-sm hover:bg-sky-50 sm:self-center"
        >
          Show methodology overview
        </button>
      </div>
    </div>
  );
}
