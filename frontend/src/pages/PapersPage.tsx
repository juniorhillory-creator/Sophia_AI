import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDocument, fetchDocuments, rejectUpload, uploadDocument, errorMessage } from "../api/client";
import type { Document } from "../api/types";
import { AppLayout } from "../components/Navigation/AppLayout";
import { EmptyState, LoadingSkeleton } from "../components/EmptyState";

export function PapersPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPapers();
  }, []);

  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will remove its vectors and summary permanently.`)) {
      return;
    }
    setDeletingId(docId);
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert(`Failed to delete: ${errorMessage(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

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
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 0), 0);

  return (
    <AppLayout>
      <div className="flex h-full flex-col min-w-0 bg-stone-50 overflow-y-auto scrollbar-thin">
        {/* Header bar */}
        <header className="border-b border-stone-200 bg-white px-6 py-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-6xl mx-auto w-full">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">My Research Papers</h1>
              <p className="text-xs text-stone-500 mt-1">
                Your personal library of indexed papers ready for AI summarization, citation, and writing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="application/pdf,.pdf"
                id="library-upload"
                className="sr-only"
                onChange={(e) => void handleFileUpload(e.target.files)}
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => document.getElementById("library-upload")?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-xs"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {uploading ? (uploadPercent ? `Uploading ${uploadPercent}%` : "Indexing...") : "Upload Research Paper"}
              </button>
            </div>
          </div>
        </header>

        {uploadError && (
          <div className="max-w-6xl mx-auto w-full px-6 pt-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {uploadError}
            </div>
          </div>
        )}

        <main className="max-w-6xl mx-auto w-full px-6 py-6 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total Papers</span>
              <p className="text-2xl font-bold text-stone-900 mt-1 font-mono">{documents.length}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total Pages Indexed</span>
              <p className="text-2xl font-bold text-stone-900 mt-1 font-mono">{totalPages}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Grounded Citations</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">100%</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search papers by filename..."
                className="w-full rounded-lg border border-stone-300 bg-white pl-9 pr-4 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand focus:ring-1 focus:ring-brand shadow-xs"
              />
            </div>
          </div>

          {/* Content table */}
          {loading ? (
            <LoadingSkeleton count={4} />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => void loadPapers()}
                className="mt-3 text-xs font-semibold text-brand underline"
              >
                Retry
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <EmptyState
              onUploadClick={() => document.getElementById("library-upload")?.click()}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Research Paper</th>
                    <th className="py-3 px-4">Pages</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Added</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-stone-900 max-w-[280px] truncate">
                        <div className="flex items-center gap-2.5">
                          <svg className="h-5 w-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="truncate" title={doc.filename}>{doc.filename}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 font-mono">{doc.page_count}</td>
                      <td className="py-3.5 px-4 text-stone-600 font-mono">{doc.chunk_count}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                          Ready
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/workspace/${doc.id}`)}
                          className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-xs"
                          title="Open split-view Workspace (PDF + Summary + Chat)"
                        >
                          Workspace
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/writer/${doc.id}`)}
                          className="rounded-md border border-brand/30 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/20 shadow-xs"
                          title="Open in SciSpace-inspired AI Writer"
                        >
                          AI Writer
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(doc.id, doc.filename)}
                          disabled={deletingId === doc.id}
                          className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Delete paper"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
}

