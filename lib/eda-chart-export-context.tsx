"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import JSZip from "jszip";
import type { ExportSettings } from "@/components/ExportableChart";

type ExporterEntry = {
  order: number;
  fileBaseName: string;
  captureToBlob: (settings: ExportSettings) => Promise<Blob | null>;
};

export type EdaChartExportRegistry = {
  registerChart: (
    key: string,
    order: number,
    fileBaseName: string,
    captureToBlob: (settings: ExportSettings) => Promise<Blob | null>
  ) => void;
  unregisterChart: (key: string) => void;
  exportAllAsZip: (settings: ExportSettings, zipFileName: string) => Promise<void>;
};

const EdaChartExportContext = createContext<EdaChartExportRegistry | undefined>(
  undefined
);

function sanitizeZipName(name: string): string {
  const base = name.replace(/\.zip$/i, "").replace(/[^a-z0-9-_]/gi, "_");
  return `${base || "eda_figures"}.zip`;
}

export function EdaChartExportProvider({ children }: { children: ReactNode }) {
  const chartsRef = useRef(new Map<string, ExporterEntry>());

  const registerChart = useCallback(
    (
      key: string,
      order: number,
      fileBaseName: string,
      captureToBlob: (settings: ExportSettings) => Promise<Blob | null>
    ) => {
      chartsRef.current.set(key, { order, fileBaseName, captureToBlob });
    },
    []
  );

  const unregisterChart = useCallback((key: string) => {
    chartsRef.current.delete(key);
  }, []);

  const exportAllAsZip = useCallback(
    async (settings: ExportSettings, zipFileName: string) => {
      const sorted = [...chartsRef.current.entries()].sort(
        (a, b) => a[1].order - b[1].order
      );
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const [regKey, { fileBaseName, captureToBlob }] of sorted) {
        const blob = await captureToBlob(settings);
        if (!blob) continue;
        let safeBase = fileBaseName.replace(/[^a-z0-9-_]/gi, "_") || "chart";
        let entryName = `${safeBase}.png`;
        if (usedNames.has(entryName)) {
          safeBase = `${safeBase}_${regKey.replace(/[^a-z0-9-_]/gi, "_")}`;
          entryName = `${safeBase}.png`;
        }
        usedNames.add(entryName);
        zip.file(entryName, blob);
        await new Promise((r) => setTimeout(r, 0));
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sanitizeZipName(zipFileName);
      link.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  const value = useMemo(
    () => ({ registerChart, unregisterChart, exportAllAsZip }),
    [registerChart, unregisterChart, exportAllAsZip]
  );

  return (
    <EdaChartExportContext.Provider value={value}>
      {children}
    </EdaChartExportContext.Provider>
  );
}

export function useEdaChartExportRegistry(): EdaChartExportRegistry | undefined {
  return useContext(EdaChartExportContext);
}
