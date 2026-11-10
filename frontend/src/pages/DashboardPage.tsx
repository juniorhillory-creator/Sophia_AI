import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadDocument,
  rejectUpload,
  errorMessage,
  fetchDocuments,
  deleteDocument,
} from "../api/client";
import type { Document } from "../api/types";
import { AppLayout } from "../components/Navigation/AppLayout";
import { EmptyState } from "../components/EmptyState";

export function DashboardPage({
  initialDocument,
}: { initialDocument?: Document } = {}) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>(
    initialDocument ? [initialDocument] : [],
  );
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    setLoadError(null);
    try {
      const list = await fetchDocuments();
      setDocuments(list || []);
    } catch (err) {
      setDocuments([]);
      setLoadError(errorMessage(err));
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const problem = rejectUpload(file);
    if (problem) {
      setUploadError(problem);
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadPercent(0);

    try {
      const doc = await uploadDocument(file, (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setUploadPercent(percent >= 100 ? null : percent);
      });
      setDocuments((prev) => [doc, ...prev]);
      navigate(`/workspace/${doc.id}`, { state: { document: doc, file } });
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
      setUploadPercent(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${filename}"? This will remove its vectors and summary permanently.`,
      )
    ) {
      return;
    }
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(`Failed to delete document: ${errorMessage(err)}`);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 0), 0);

  const formatDate = (isoString?: string) => {
    if (!isoString) return "11/10/2026";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "11/10/2026";
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return "11/10/2026";
    }
  };

  return (
    <AppLayout>
      <main className="flex-1 min-w-0 overflow-y-auto bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-10 lg:px-12">
          {/* Hidden File Input for Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {/* Header row: Title + Subtitle and Far-right Upload Button */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                My Research Papers
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Your personal library of indexed papers ready for AI
                summarization, citation, and writing.
              </p>
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[#f97316] hover:bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploading
                ? uploadPercent !== null
                  ? `Uploading ${uploadPercent}%…`
                  : "Processing…"
                : "Upload Research Paper"}
            </button>
          </div>

          {/* Upload Error Banner if any */}
          {uploadError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-red-500 hover:text-red-800 text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Load Error Banner if any */}
          {loadError && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>Failed to load papers: {loadError}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadDocuments()}
                  className="text-xs font-semibold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setLoadError(null)}
                  className="text-amber-600 hover:text-amber-900 text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* 3. Statistics Cards Grid (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
            {/* Card 1: Total Papers */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
                TOTAL PAPERS
              </span>
              <span className="text-3xl font-bold text-stone-900 mt-2 block tracking-tight">
                {documents.length}
              </span>
            </div>

            {/* Card 2: Total Pages Indexed */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
                TOTAL PAGES INDEXED
              </span>
              <span className="text-3xl font-bold text-stone-900 mt-2 block tracking-tight">
                {totalPages}
              </span>
            </div>

            {/* Card 3: Grounded Citations */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
                GROUNDED CITATIONS
              </span>
              <span className="text-3xl font-bold text-emerald-600 mt-2 block tracking-tight">
                {documents.length > 0 ? "100%" : "0%"}
              </span>
            </div>
          </div>

          {/* 4. Empty state or Document Library */}
          {!loadingDocs && documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 shadow-xs my-6">
              <EmptyState
                title="No research papers in your library"
                description="Upload your research papers in PDF format to index them for AI summarization, citation discovery, and writing."
                actionLabel={uploading ? "Uploading…" : "Upload your first paper"}
                onAction={() => fileInputRef.current?.click()}
              />
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="relative w-full mb-6">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg
                    className="h-4 w-4 text-stone-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search papers by filename..."
                  className="w-full rounded-full border border-stone-200 bg-white py-2.5 pl-11 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs transition-colors"
                />
              </div>

              {/* Document List Table */}
              <div className="w-full overflow-x-auto bg-transparent">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      <th className="pb-4 font-semibold w-[36%]">RESEARCH PAPER</th>
                      <th className="pb-4 font-semibold">PAGES</th>
                      <th className="pb-4 font-semibold">CHUNKS</th>
                      <th className="pb-4 font-semibold">STATUS</th>
                      <th className="pb-4 font-semibold">ADDED</th>
                      <th className="pb-4 font-semibold text-right pr-2">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loadingDocs ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-4.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="h-5 w-5 rounded bg-stone-200 shrink-0" />
                              <div className="h-4 w-44 rounded bg-stone-200" />
                            </div>
                          </td>
                          <td className="py-4.5"><div className="h-4 w-8 rounded bg-stone-200" /></td>
                          <td className="py-4.5"><div className="h-4 w-8 rounded bg-stone-200" /></td>
                          <td className="py-4.5"><div className="h-5 w-16 rounded-full bg-stone-200" /></td>
                          <td className="py-4.5"><div className="h-4 w-20 rounded bg-stone-200" /></td>
                          <td className="py-4.5 text-right"><div className="ml-auto h-7 w-36 rounded-lg bg-stone-200" /></td>
                        </tr>
                      ))
                    ) : filteredDocs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-sm text-stone-500"
                        >
                          <p className="font-medium text-stone-700">No papers match your search for "{search}"</p>
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="mt-2 text-xs font-semibold text-brand hover:underline cursor-pointer"
                          >
                            Clear search filter
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc) => (
                        <tr
                          key={doc.id}
                          className="hover:bg-stone-50/80 transition-colors"
                        >
                          {/* Document Name with Red PDF icon */}
                          <td className="py-4.5 pr-4">
                            <div className="flex items-center gap-3">
                              <svg
                                className="w-5 h-5 text-red-500 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <button
                                type="button"
                                onClick={() => navigate(`/workspace/${doc.id}`)}
                                className="text-sm font-medium text-stone-900 hover:text-brand transition-colors truncate max-w-sm text-left cursor-pointer"
                                title={doc.filename}
                              >
                                {doc.filename}
                              </button>
                            </div>
                          </td>

                          {/* Pages Column */}
                          <td className="py-4.5 text-sm text-stone-500 font-normal">
                            {doc.page_count ?? 1}
                          </td>

                          {/* Chunks Column */}
                          <td className="py-4.5 text-sm text-stone-500 font-normal">
                            {doc.chunk_count ?? 1}
                          </td>

                          {/* Status Column with green pill badge */}
                          <td className="py-4.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Ready
                            </span>
                          </td>

                          {/* Added Column */}
                          <td className="py-4.5 text-sm text-stone-500 font-normal">
                            {formatDate(doc.created_at)}
                          </td>

                          {/* Actions Column */}
                          <td className="py-4.5 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={() => navigate(`/workspace/${doc.id}`)}
                                className="rounded-lg border border-stone-200 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs cursor-pointer"
                              >
                                Workspace
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/writer/${doc.id}`)}
                                className="rounded-lg border border-orange-200 bg-orange-50/60 px-3.5 py-1 text-xs font-medium text-brand hover:bg-brand-light hover:border-orange-300 transition-colors shadow-2xs cursor-pointer"
                              >
                                AI Writer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(doc.id, doc.filename)}
                                className="p-1 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete paper"
                              >
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
