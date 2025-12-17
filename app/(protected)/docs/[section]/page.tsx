"use client"; 

import { DOCS_STRUCTURE } from "@/lib/doc-structure";
import { notFound } from "next/navigation";
import { useState } from "react";

interface Props {
  params: {
    section: string;
  };
}

const ITEMS_PER_PAGE = 1; 

export default function DocsSectionPage({ params }: Props) {
  const section =
    DOCS_STRUCTURE[params.section as keyof typeof DOCS_STRUCTURE];

  if (!section) {
    notFound();
  }

  const files = Object.entries(section.files);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentFiles = files.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div className="max-w-4xl p-8 space-y-8">
      {/* SECTION TITLE */}
      <header>
        <h1 className="text-3xl font-bold mb-2">{section.title}</h1>
        <p className="text-gray-400 whitespace-pre-line">{section.description}</p>
      </header>

      {/* FILE / FOLDER EXPLANATIONS */}
      <div className="space-y-6">
        {currentFiles.map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-white/10 bg-black/30 p-6"
          >
            <h2 className="text-xl font-semibold mb-2">{value.title}</h2>
            <p className="text-gray-300 whitespace-pre-line leading-relaxed">
              {value.explanation}
            </p>
            <div className="mt-3 text-xs text-gray-500 font-mono">Path name: {key}</div>
          </div>
        ))}
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <button
            className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Previous
          </button>

          <span className="text-gray-300">
            Page {currentPage} of {totalPages}
          </span>

          <button
            className="px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
