"use client";

import { useState } from "react";
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

export default function StatusUpdateView({
  selectedUpdateId,
  onSelectUpdate,
}: StatusUpdateViewProps) {
  const selectedUpdate = STATUS_UPDATES.find((u) => u.id === selectedUpdateId);

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-72 shrink-0 border-r border-zinc-200 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Status Updates
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {STATUS_UPDATES.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelectUpdate(selectedUpdateId === u.id ? null : u.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-xs transition-colors ${
                selectedUpdateId === u.id
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span className="font-medium">Update {u.number}</span>
              <span className={`block truncate mt-0.5 ${selectedUpdateId === u.id ? "text-blue-500" : "text-zinc-400"}`}>
                {u.title}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-50/50">
        {!selectedUpdate ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-400">
              Select a status update to view
            </p>
          </div>
        ) : (
          <div className="p-8 max-w-4xl mx-auto">
            <article>
              <header className="mb-8 pb-6 border-b border-zinc-200">
                <h1 className="text-2xl font-bold text-zinc-900">
                  Status Update {selectedUpdate.number}: {selectedUpdate.title}
                </h1>
                {selectedUpdate.date && (
                  <p className="text-sm text-zinc-500 mt-1">{selectedUpdate.date}</p>
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
      </main>
    </div>
  );
}
