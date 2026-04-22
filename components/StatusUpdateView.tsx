"use client";

import { useState, useEffect, useCallback } from "react";
import type { StatusUpdateSection } from "@/lib/status-updates";
import { STATUS_UPDATES } from "@/lib/status-updates";

interface StatusUpdateViewProps {
  selectedUpdateId: string | null;
  onSelectUpdate: (id: string | null) => void;
}

function StatusUpdateImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[200px] bg-zinc-100 rounded-lg border border-zinc-200 border-dashed">
        <svg className="w-12 h-12 text-zinc-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-zinc-500">{alt}</span>
        <span className="text-xs text-zinc-400 mt-1">Add image to public/status-updates/</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full rounded-lg border border-zinc-200 shadow-sm"
      onError={() => setError(true)}
    />
  );
}

function SectionRenderer({ section }: { section: StatusUpdateSection }) {
  switch (section.type) {
    case "heading": {
      const Tag = section.level === 1 ? "h1" : section.level === 2 ? "h2" : "h3";
      const headingClass =
        section.level === 1
          ? "text-2xl font-bold text-zinc-900 mt-8 mb-4 first:mt-0"
          : section.level === 2
            ? "text-xl font-semibold text-zinc-900 mt-8 mb-3"
            : "text-lg font-medium text-zinc-800 mt-6 mb-2";
      return <Tag className={headingClass}>{section.text}</Tag>;
    }

    case "paragraph":
      return (
        <p className="text-zinc-700 leading-relaxed mb-4 max-w-3xl">{section.text}</p>
      );

    case "list":
      return (
        <ul className="list-disc list-inside text-zinc-700 space-y-1.5 mb-4 max-w-3xl ml-2">
          {(section.items as string[] | undefined)?.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol className="list-decimal list-inside text-zinc-700 space-y-1.5 mb-4 max-w-3xl ml-2">
          {(section.items as string[] | undefined)?.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ol>
      );

    case "description":
      return (
        <dl className="space-y-2 mb-4 max-w-3xl">
          {(section.items as { term: string; description: string }[] | undefined)?.map((item, i) => (
            <div key={i} className="pl-2 border-l-2 border-zinc-200">
              <dt className="font-mono text-sm font-medium text-zinc-800">{item.term}</dt>
              <dd className="text-zinc-700 text-sm mt-0.5 ml-0">{item.description}</dd>
            </div>
          ))}
        </dl>
      );

    case "table": {
      const t = section.table;
      if (!t) return null;
      return (
        <div className="my-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-zinc-200 rounded-lg overflow-hidden">
            {t.caption && (
              <caption className="text-left text-zinc-500 italic py-2 px-3 bg-zinc-50">
                {t.caption}
              </caption>
            )}
            <thead>
              <tr className="bg-zinc-100">
                {t.headers.map((h, i) => (
                  <th key={i} className="border border-zinc-200 px-3 py-2 text-left font-semibold text-zinc-800">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-zinc-200 px-3 py-2 text-zinc-700">
                      {typeof cell === "number" ? cell.toLocaleString(undefined, { maximumFractionDigits: 2 }) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "figure":
      return (
        <figure className="my-8 space-y-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: section.images && section.images.length > 1 ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr" }}>
            {section.images?.map((img, i) => (
              <StatusUpdateImage key={i} src={img.src} alt={img.alt} />
            ))}
          </div>
          {section.caption && (
            <figcaption className="text-sm text-zinc-500 italic max-w-3xl">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );

    case "references":
      return (
        <div className="mt-6 pt-4 border-t border-zinc-200">
          <ul className="space-y-1.5 text-sm text-zinc-600">
            {section.references?.map((ref) => (
              <li key={ref.key}>{ref.text}</li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

function StatusUpdateList({
  selectedUpdateId,
  onSelectUpdate,
  onPick,
  showClose,
  onClose,
}: StatusUpdateViewProps & {
  onPick?: (id: string | null) => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full min-h-0 w-72 max-w-[min(18rem,90vw)] shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white lg:max-w-none">
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <h2
          id={showClose ? "status-updates-panel-title" : undefined}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          Status Updates
        </h2>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 lg:hidden"
            aria-label="Close status updates list"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {STATUS_UPDATES.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              const next = selectedUpdateId === u.id ? null : u.id;
              onSelectUpdate(next);
              onPick?.(next);
            }}
            className={`w-full rounded-md px-3 py-2.5 text-left text-xs transition-colors ${
              selectedUpdateId === u.id
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <span className="font-medium">Update {u.number}</span>
            <span
              className={`mt-0.5 block truncate ${selectedUpdateId === u.id ? "text-blue-500" : "text-zinc-400"}`}
            >
              {u.title}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default function StatusUpdateView({
  selectedUpdateId,
  onSelectUpdate,
}: StatusUpdateViewProps) {
  const selectedUpdate = STATUS_UPDATES.find((u) => u.id === selectedUpdateId);
  const [listOpen, setListOpen] = useState(false);

  const closeList = useCallback(() => setListOpen(false), []);

  useEffect(() => {
    if (!listOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [listOpen]);

  useEffect(() => {
    if (!listOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeList();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen, closeList]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="hidden h-full min-h-0 shrink-0 lg:flex">
        <StatusUpdateList selectedUpdateId={selectedUpdateId} onSelectUpdate={onSelectUpdate} />
      </div>

      {listOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-updates-panel-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/40"
            aria-label="Close status updates list"
            onClick={closeList}
          />
          <div className="relative flex h-full min-h-0 max-w-[min(20rem,92vw)] shadow-xl">
            <StatusUpdateList
              selectedUpdateId={selectedUpdateId}
              onSelectUpdate={onSelectUpdate}
              onPick={() => closeList()}
              showClose
              onClose={closeList}
            />
          </div>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/50">
        <div className="z-10 flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <svg
              className="h-4 w-4 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            All updates
          </button>
          {selectedUpdate && (
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
              Update {selectedUpdate.number}: {selectedUpdate.title}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!selectedUpdate ? (
            <div className="flex h-full min-h-[40vh] items-center justify-center px-4">
              <p className="text-center text-sm text-zinc-400">
                Select a status update to view, or open the list on your phone.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
              <article>
                <header className="mb-6 border-b border-zinc-200 pb-4 sm:mb-8 sm:pb-6">
                  <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
                    Status Update {selectedUpdate.number}: {selectedUpdate.title}
                  </h1>
                  {selectedUpdate.date && (
                    <p className="mt-1 text-sm text-zinc-500">{selectedUpdate.date}</p>
                  )}
                </header>

                <div className="space-y-0">
                  {selectedUpdate.content.map((section, i) => (
                    <SectionRenderer key={i} section={section} />
                  ))}
                </div>
              </article>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
