import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import {
  errorMessage,
  fetchDocument,
  fetchDocumentFile,
  rejectUpload,
  uploadDocument,
} from "../api/client";
import type { Document } from "../api/types";
import { AppLayout } from "../components/Navigation/AppLayout";
import { ChatPanel } from "../components/ChatPanel";
import { PdfViewer } from "../components/PdfViewer";
import { SummaryPanel } from "../components/SummaryPanel";

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "upload"; filename: string; percent: number | null }
  | { kind: "ready"; document: Document; file: File | Blob };

export function WorkspacePage() {
  const { documentId } = useParams<{ documentId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"summary" | "chat">("summary");
  const [isDragOver, setIsDragOver] = useState(false);

  // Jump to specific PDF page and focus viewer
  const openPage = useCallback((next: number) => {
    setPage(next);
    const viewer = document.getElementById("pdf-viewer");
    viewer?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    viewer?.focus();
  }, []);

  // Check if navigation state passed document and file directly
  useEffect(() => {
    const navState = location.state as { document?: Document; file?: File | Blob } | undefined;

    if (navState?.document && navState?.file) {
      setPhase({ kind: "ready", document: navState.document, file: navState.file });
      setError(null);
      return;
    }

    // If documentId param is in URL, fetch from API
    if (documentId) {
      let isMounted = true;
      setPhase({ kind: "loading", message: "Loading research paper…" });
      setError(null);

      Promise.all([fetchDocument(documentId), fetchDocumentFile(documentId)])
        .then(([doc, blob]) => {
          if (!isMounted) return;
          setPhase({ kind: "ready", document: doc, file: blob });
          setPage(1);
        })
        .catch((err) => {
          if (!isMounted) return;
          setPhase({ kind: "idle" });
          setError(errorMessage(err));
        });

      return () => {
        isMounted = false;
      };
    } else {
      setPhase({ kind: "idle" });
    }
  }, [documentId, location.state]);

  async function handleFileUpload(file: File) {
    const problem = rejectUpload(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPhase({ kind: "upload", filename: file.name, percent: 0 });

    try {
      const doc = await uploadDocument(file, (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setPhase({
          kind: "upload",
          filename: file.name,
          percent: percent >= 100 ? null : percent,
        });
      });
      setPage(1);
      setTab("summary");
      setPhase({ kind: "ready", document: doc, file });
      navigate(`/workspace/${doc.id}`, { replace: true, state: { document: doc, file } });
    } catch (err) {
      setPhase({ kind: "idle" });
      setError(errorMessage(err));
    }
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = tab === "summary" ? "chat" : "summary";
    setTab(next);
    document.getElementById(next === "summary" ? "tab-summary" : "tab-chat")?.focus();
  }

  return (
    <AppLayout activeItem="workspace">
      <div className="flex h-full flex-col bg-stone-100 overflow-hidden">
        {/* Workspace Subheader Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 sm:px-6 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/papers"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              <span>Library</span>
            </Link>
            <span className="text-stone-300">/</span>
            {phase.kind === "ready" ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-semibold text-stone-900 max-w-xs sm:max-w-md">
                  {phase.document.filename}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-stone-600">Research Workspace</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {phase.kind === "ready" && (
              <Link
                to={`/writer/${phase.document.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-1"
                title="Open paper in AI Writer draft"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Draft in Writer</span>
              </Link>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {phase.kind === "loading" && (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-stone-50">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-stone-200 border-t-brand" />
              <p className="mt-4 text-sm font-medium text-stone-600">{phase.message}</p>
            </div>
          )}

          {phase.kind === "upload" && (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-stone-50">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border border-stone-200">
                <div className="h-10 w-10 mx-auto rounded-full bg-brand-light text-brand flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-stone-900">Processing Paper</h3>
                <p className="mt-1 text-xs text-stone-500 truncate">{phase.filename}</p>

                <div className="mt-4 h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-300"
                    style={{ width: phase.percent !== null ? `${phase.percent}%` : "100%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  {phase.percent !== null ? `Uploading: ${phase.percent}%` : "Extracting pages & generating embeddings…"}
                </p>
              </div>
            </div>
          )}

          {phase.kind === "idle" && (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center bg-stone-50 overflow-y-auto">
              <div className="w-full max-w-lg">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0) void handleFileUpload(files[0]);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-10 transition-all ${
                    isDragOver
                      ? "border-brand bg-brand-light/30 ring-2 ring-brand/20"
                      : "border-stone-300 bg-white hover:border-stone-400 shadow-sm"
                  }`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand mb-4">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900">Open a research paper</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Drag and drop your PDF here, or select from your library.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <label className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-dark transition-colors">
                      <span>Browse PDF</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleFileUpload(file);
                        }}
                      />
                    </label>
                    <Link
                      to="/papers"
                      className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      Browse Library
                    </Link>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-left">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {phase.kind === "ready" && (
            <div className="flex h-full flex-col lg:flex-row min-h-0">
              {/* Left Pane: PDF Viewer (50% on desktop) */}
              <section
                id="pdf-viewer"
                tabIndex={-1}
                aria-label="PDF Document Viewer"
                className="h-[55vh] lg:h-full lg:w-1/2 shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-100 flex flex-col focus:outline-none"
              >
                <PdfViewer file={phase.file} page={page} onPageChange={setPage} />
              </section>

              {/* Right Pane: Summary & Chat Tools (50% on desktop) */}
              <section
                aria-label="Paper Analysis and Chat"
                className="flex-1 flex flex-col bg-white min-h-0 lg:w-1/2"
              >
                {/* SciSpace-style Tabs */}
                <div
                  role="tablist"
                  aria-label="Research Workspace Tools"
                  className="flex shrink-0 items-center gap-6 border-b border-stone-200 px-6 bg-white"
                  onKeyDown={onTabKey}
                >
                  <button
                    type="button"
                    id="tab-summary"
                    role="tab"
                    aria-selected={tab === "summary"}
                    aria-controls="panel-summary"
                    tabIndex={tab === "summary" ? 0 : -1}
                    onClick={() => setTab("summary")}
                    className={`flex items-center gap-2 border-b-2 py-3.5 text-sm font-semibold transition-colors ${
                      tab === "summary"
                        ? "border-brand text-brand"
                        : "border-transparent text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                    <span>Paper Summary</span>
                  </button>

                  <button
                    type="button"
                    id="tab-chat"
                    role="tab"
                    aria-selected={tab === "chat"}
                    aria-controls="panel-chat"
                    tabIndex={tab === "chat" ? 0 : -1}
                    onClick={() => setTab("chat")}
                    className={`flex items-center gap-2 border-b-2 py-3.5 text-sm font-semibold transition-colors ${
                      tab === "chat"
                        ? "border-brand text-brand"
                        : "border-transparent text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>Research Chat (RAG)</span>
                  </button>
                </div>

                {/* Tab Panels */}
                <div className="relative flex-1 min-h-0">
                  <div
                    role="tabpanel"
                    id="panel-summary"
                    aria-labelledby="tab-summary"
                    hidden={tab !== "summary"}
                    className="h-full overflow-y-auto px-6 py-6"
                  >
                    <SummaryPanel
                      documentId={phase.document.id}
                      filename={phase.document.filename}
                    />
                  </div>

                  <div
                    role="tabpanel"
                    id="panel-chat"
                    aria-labelledby="tab-chat"
                    hidden={tab !== "chat"}
                    className="h-full px-6 py-6"
                  >
                    <ChatPanel
                      documentId={phase.document.id}
                      onOpenPage={openPage}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

