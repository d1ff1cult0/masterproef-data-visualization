"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { ExportSettings } from "@/components/ExportableChart";

type ExporterEntry = {
  order: number;
  exportPng: (settings: ExportSettings) => Promise<void>;
};

export type EdaChartExportRegistry = {
  registerChart: (
    key: string,
    order: number,
    exportPng: (settings: ExportSettings) => Promise<void>
  ) => void;
  unregisterChart: (key: string) => void;
  exportAllCharts: (settings: ExportSettings) => Promise<void>;
};

const EdaChartExportContext = createContext<EdaChartExportRegistry | undefined>(
  undefined
);

export function EdaChartExportProvider({ children }: { children: ReactNode }) {
  const chartsRef = useRef(new Map<string, ExporterEntry>());

  const registerChart = useCallback(
    (key: string, order: number, exportPng: (settings: ExportSettings) => Promise<void>) => {
      chartsRef.current.set(key, { order, exportPng });
    },
    []
  );

  const unregisterChart = useCallback((key: string) => {
    chartsRef.current.delete(key);
  }, []);

  const exportAllCharts = useCallback(async (settings: ExportSettings) => {
    const sorted = [...chartsRef.current.entries()].sort(
      (a, b) => a[1].order - b[1].order
    );
    for (const [, { exportPng }] of sorted) {
      await exportPng(settings);
      await new Promise((r) => setTimeout(r, 220));
    }
  }, []);

  const value = useMemo(
    () => ({ registerChart, unregisterChart, exportAllCharts }),
    [registerChart, unregisterChart, exportAllCharts]
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
