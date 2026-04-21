"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import ExportSettingsModal from "./ExportSettingsModal";
import { useEdaChartExportRegistry } from "@/lib/eda-chart-export-context";

export interface ExportSettings {
  includeTitle: boolean;
  fontSize: number;
  boldLabels: boolean;
  dpi: number;
  backgroundColor: string;
}

const DEFAULT_SETTINGS: ExportSettings = {
  includeTitle: true,
  fontSize: 12,
  boldLabels: true,
  dpi: 300,
  backgroundColor: "#ffffff",
};

interface ExportableChartProps {
  title?: string;
  filename?: string;
  children: React.ReactNode;
  /** Optional: elements with this class are excluded when includeTitle is false */
  titleClassName?: string;
  /** Optional: elements with this class are always excluded from export (e.g. buttons) */
  excludeClassName?: string;
  /** Register for EDA page “Export all PNG” (unique key, sort order) */
  edaRegister?: { key: string; order: number };
}

export function ExportableChart({
  title,
  filename = "chart",
  children,
  titleClassName = "chart-export-title",
  excludeClassName = "chart-export-exclude",
  edaRegister,
}: ExportableChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const edaRegistry = useEdaChartExportRegistry();
  const captureToBlobRef = useRef<(s: ExportSettings) => Promise<Blob | null>>(
    async () => null
  );

  const captureToBlob = useCallback(
    async (exportSettings: ExportSettings): Promise<Blob | null> => {
      const node = containerRef.current;
      if (!node) return null;

      const pixelRatio = exportSettings.dpi / 72;

      const filter = (el: HTMLElement) => {
        if (el.classList?.contains(excludeClassName)) return false;
        if (!exportSettings.includeTitle && el.classList?.contains(titleClassName))
          return false;
        return true;
      };

      const style = {
        fontSize: `${exportSettings.fontSize}px`,
        fontWeight: exportSettings.boldLabels ? "600" : "400",
      };

      try {
        const dataUrl = await toPng(node, {
          pixelRatio,
          backgroundColor: exportSettings.backgroundColor,
          filter,
          cacheBust: true,
          style,
        });
        const res = await fetch(dataUrl);
        return await res.blob();
      } catch (err) {
        console.error("Export failed:", err);
        return null;
      }
    },
    [titleClassName, excludeClassName]
  );

  captureToBlobRef.current = captureToBlob;

  const handleExport = useCallback(
    async (exportSettings: ExportSettings) => {
      setSettings(exportSettings);
      const blob = await captureToBlobRef.current(exportSettings);
      if (!blob) return;
      const safeName = `${filename.replace(/[^a-z0-9-_]/gi, "_")}.png`;
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.download = safeName;
        link.href = url;
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [filename]
  );

  useEffect(() => {
    if (!edaRegister || !edaRegistry) return;
    const fileBase = filename.replace(/[^a-z0-9-_]/gi, "_") || "chart";
    edaRegistry.registerChart(
      edaRegister.key,
      edaRegister.order,
      fileBase,
      (s) => captureToBlobRef.current(s)
    );
    return () => edaRegistry.unregisterChart(edaRegister.key);
  }, [edaRegistry, edaRegister?.key, edaRegister?.order, filename]);

  const hasExportTitle = Boolean(title);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="exportable-chart-container"
        style={{ position: "relative" }}
      >
        <div className={`${excludeClassName} flex justify-end mb-1`}>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-600 bg-white/90 hover:bg-white border border-zinc-200 rounded-md shadow-sm transition-colors"
            title="Export chart as PNG"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PNG
          </button>
        </div>
        {title && (
          <div
            className={`${titleClassName} text-sm font-semibold text-zinc-700 mb-2 w-full text-center px-1 leading-snug`}
          >
            {title}
          </div>
        )}
        {children}
      </div>
      <ExportSettingsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={(s) => {
          handleExport(s);
          setShowModal(false);
        }}
        defaultSettings={settings}
        includeTitleOption={hasExportTitle}
      />
    </div>
  );
}
