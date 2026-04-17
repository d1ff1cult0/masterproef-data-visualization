"use client";

import type { ExportSettings } from "./ExportableChart";

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void | Promise<void>;
  defaultSettings: ExportSettings;
  modalTitle?: string;
  modalDescription?: string;
  submitButtonLabel?: string;
  /** When false, the chart has no title and “Include title” is hidden; exports omit a title row. */
  includeTitleOption?: boolean;
}

const DPI_OPTIONS = [
  { value: 150, label: "150 (Screen)" },
  { value: 300, label: "300 (Print)" },
  { value: 600, label: "600 (High-res print)" },
];

export default function ExportSettingsModal({
  isOpen,
  onClose,
  onExport,
  defaultSettings,
  modalTitle = "Export chart as PNG",
  modalDescription = "Configure export options for papers and presentations.",
  submitButtonLabel = "Export PNG",
  includeTitleOption = true,
}: ExportSettingsModalProps) {
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const settings: ExportSettings = {
      includeTitle: includeTitleOption
        ? ((form.elements.namedItem("includeTitle") as HTMLInputElement)?.checked ?? true)
        : false,
      fontSize: Number((form.elements.namedItem("fontSize") as HTMLInputElement)?.value) || 12,
      boldLabels: (form.elements.namedItem("boldLabels") as HTMLInputElement)?.checked ?? true,
      dpi: Number((form.elements.namedItem("dpi") as HTMLSelectElement)?.value) || 300,
      backgroundColor: (form.elements.namedItem("backgroundColor") as HTMLInputElement)?.value || "#ffffff",
    };
    await onExport(settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl border border-zinc-200 p-6 max-w-md w-full mx-4">
        <h3 className="text-base font-semibold text-zinc-900 mb-4">
          {modalTitle}
        </h3>
        <p className="text-sm text-zinc-500 mb-4">
          {modalDescription}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {includeTitleOption && (
            <div className="flex items-center justify-between">
              <label htmlFor="includeTitle" className="text-sm text-zinc-700">
                Include title in export
              </label>
              <input
                id="includeTitle"
                name="includeTitle"
                type="checkbox"
                defaultChecked={defaultSettings.includeTitle}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="fontSize" className="block text-sm text-zinc-700 mb-1">
              Font size (axis labels, legend, title)
            </label>
            <input
              id="fontSize"
              name="fontSize"
              type="number"
              min={8}
              max={24}
              defaultValue={defaultSettings.fontSize}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-zinc-400 mt-0.5">8–24 px. Larger values improve readability in slides.</p>
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="boldLabels" className="text-sm text-zinc-700">
              Bold axis labels and legend
            </label>
            <input
              id="boldLabels"
              name="boldLabels"
              type="checkbox"
              defaultChecked={defaultSettings.boldLabels}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="dpi" className="block text-sm text-zinc-700 mb-1">
              Resolution (DPI)
            </label>
            <select
              id="dpi"
              name="dpi"
              defaultValue={defaultSettings.dpi}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {DPI_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-400 mt-0.5">300 DPI recommended for print.</p>
          </div>
          <div>
            <label htmlFor="backgroundColor" className="block text-sm text-zinc-700 mb-1">
              Background color
            </label>
            <div className="flex gap-2">
              <input
                id="backgroundColor"
                name="backgroundColor"
                type="color"
                defaultValue={defaultSettings.backgroundColor}
                className="h-10 w-14 rounded border border-zinc-200 cursor-pointer"
              />
              <input
                type="text"
                name="backgroundColorText"
                defaultValue={defaultSettings.backgroundColor}
                onChange={(e) => {
                  const colorInput = document.getElementById("backgroundColor") as HTMLInputElement;
                  if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) colorInput.value = e.target.value;
                }}
                placeholder="#ffffff"
                className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Use hex (e.g. #ffffff) for white.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {submitButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
