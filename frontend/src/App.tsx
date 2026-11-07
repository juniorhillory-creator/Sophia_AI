import { useCallback, useState, type KeyboardEvent } from "react";
import { errorMessage, rejectUpload, uploadDocument } from "./api/client";
import type { Document } from "./api/types";
import { ChatPanel } from "./components/ChatPanel";
import { PdfViewer } from "./components/PdfViewer";
import { SummaryPanel } from "./components/SummaryPanel";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { GoogleCallbackPage } from "./pages/GoogleCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

type Phase =
  | { kind: "idle" }
  | { kind: "upload"; filename: string; percent: number | null }
  | { kind: "ready"; document: Document; file: File };

function WorkspacePage() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"summary" | "chat">("summary");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const location = useLocation();

  const navState = location.state as { document?: Document; file?: File } | undefined;

  const openPage = useCallback((next: number) => {
    setPage(next);
    const viewer = document.getElementById("pdf-viewer");
    viewer?.scrollIntoView({ block: "nearest" });
    viewer?.focus();
  }, []);

  // Initialize from location state if available (navigated from dashboard upload)
  const [initialized, setInitialized] = useState(false);
  if (!initialized && navState?.document && navState?.file) {
    setPhase({ kind: "ready", document: navState.document, file: navState.file });
    setInitialized(true);
  }

  function takeFiles(list: FileList | null | undefined) {
    if (phase.kind === "upload") return;
    if (!list || list.length === 0) return;
    if (list.length > 1) {
      setError("Upload one PDF at a time.");
      return;
    }
    setSelectedFile(list[0]);
    void takeFile(list[0]);
  }

  async function takeFile(file: File) {
    const problem = rejectUpload(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPhase({ kind: "upload", filename: file.name, percent: 0 });
    try {
      const document = await uploadDocument(file, (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setPhase({
          kind: "upload",
          filename: file.name,
          percent: percent >= 100 ? null : percent,
        });
      });
      setPage(1);
      setTab("summary");
      setPhase({ kind: "ready", document, file });
    } catch (reason) {
      setPhase({ kind: "idle" });
      setError(errorMessage(reason));
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      <HeaderWithNavigate />
      <main className="min-h-0 flex-1 overflow-auto lg:overflow-hidden">
        <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
          <section className="h-[70vh] shrink-0 border-b border-stone-200 lg:h-full lg:w-1/2 lg:shrink lg:border-b-0 lg:border-r shadow-sm" aria-label="Paper">
            {phase.kind === "ready" ? (
              <PdfViewer file={phase.file} page={page} onPageChange={setPage} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <EmptyStateCenter />
              </div>
            )}
          </section>
          <section className="flex min-h-[32rem] flex-col bg-white lg:h-full lg:min-h-0 lg:w-1/2 shadow-sm">
            <div role="tablist" aria-label="Paper tools" className="flex shrink-0 gap-6 border-b border-stone-200 px-5 bg-stone-50/50" onKeyDown={onTabKey}>
              <TabButton id="tab-summary" controls="panel-summary" selected={tab === "summary"} onSelect={() => setTab("summary")}>
                Summary
              </TabButton>
              <TabButton id="tab-chat" controls="panel-chat" selected={tab === "chat"} onSelect={() => setTab("chat")}>
                Chat
              </TabButton>
            </div>
            <div className="relative min-h-[28rem] flex-1 lg:min-h-0">
              <div
                role="tabpanel"
                id="panel-summary"
                aria-labelledby="tab-summary"
                hidden={tab !== "summary"}
                className="h-full overflow-auto px-5 py-5 scrollbar-thin"
              >
                {phase.kind === "ready" ? (
                  <SummaryPanel documentId={phase.document.id} filename={phase.document.filename} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <EmptyStateCenter />
                  </div>
                )}
              </div>
              <div
                role="tabpanel"
                id="panel-chat"
                aria-labelledby="tab-chat"
                hidden={tab !== "chat"}
                className="h-full px-5 py-5 scrollbar-thin"
              >
                {phase.kind === "ready" ? (
                  <ChatPanel documentId={phase.document.id} onOpenPage={openPage} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <EmptyStateCenter />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );

  function EmptyStateCenter() {
    return (
      <div className="space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-400" aria-hidden="true">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-stone-900">No paper open</h2>
        <p className="text-sm text-stone-500">Upload a PDF or open one from the dashboard to get started.</p>
      </div>
    );
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = tab === "summary" ? "chat" : "summary";
    setTab(next);
    document.getElementById(next === "summary" ? "tab-summary" : "tab-chat")?.focus();
  }
}

function TabButton({
  id,
  controls,
  selected,
  onSelect,
  children,
}: {
  id: string;
  controls: string;
  selected: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      tabIndex={selected ? 0 : -1}
      className={`border-b-2 py-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
        selected
          ? "border-brand text-stone-900"
          : "border-transparent text-stone-500 hover:text-stone-700"
      }`}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

function UploadScreen({
  phase,
  error,
  onFiles,
  onRemoveFile,
  onUploadSelected,
}: {
  phase: Exclude<Phase, { kind: "ready" }>;
  error: string | null;
  onFiles: (files: FileList | null | undefined) => void;
  onRemoveFile: () => void;
  onUploadSelected: () => void;
}) {
  const [over, setOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const busy = phase.kind === "upload";
  const isDragOver = over && !busy;

  const status =
    phase.kind === "upload"
      ? phase.percent === null
        ? `Processing ${phase.filename}…`
        : `Uploading ${phase.filename}, ${phase.percent}%`
      : null;

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    onFiles(event.dataTransfer.files);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(event.target.files);
    event.target.value = "";
  };

  const handleRemoveFileClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFile(null);
    onRemoveFile();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand mb-6 shadow-card" aria-hidden="true">
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 text-balance">Read a paper</h1>
          <p className="mt-3 text-lg sm:text-xl leading-relaxed text-stone-600 max-w-xl mx-auto">
            Your Intelligent Research Paper Assistant
          </p>
          <p className="mt-4 text-lg sm:text-xl leading-relaxed text-stone-600 max-w-xl mx-auto">
            Upload a PDF and Sophia will write a structured summary and answer questions grounded in its pages.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-slide-up">
          {selectedFile && !busy ? (
            <div className="space-y-4" role="status" aria-live="polite">
              <div className="flex items-center gap-4 p-4 bg-brand-light rounded-xl border border-brand/20">
                <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-brand/10 text-brand" aria-hidden="true">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{selectedFile.name}</p>
                  <p className="text-sm text-stone-500">{formatFileSize(selectedFile.size)} • PDF</p>
                </div>
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-brand/10 text-brand" aria-hidden="true">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFileClick}
                  className="flex-shrink-0 p-2 text-stone-500 rounded-lg hover:bg-stone-200 hover:text-stone-700 transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
                  aria-label={`Remove ${selectedFile.name}`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className="w-full py-3 px-6 text-base font-medium text-white bg-brand rounded-xl hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
                onClick={onUploadSelected}
                disabled={busy}
              >
                {busy ? "Uploading…" : "Upload and analyze"}
              </button>
            </div>
          ) : (
            <>
              <label
                className={`relative block cursor-pointer border-2 border-dashed rounded-2xl bg-white px-6 py-12 sm:py-16 text-center transition-all duration-200 ${
                  isDragOver
                    ? "border-brand bg-brand-light ring-2 ring-brand/20 scale-[1.01] shadow-card-hover"
                    : "border-stone-300 hover:border-stone-400 hover:bg-stone-50/50"
                } ${busy ? "pointer-events-none opacity-50" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  disabled={busy}
                  onChange={handleFileChange}
                  id="pdf-upload"
                  aria-describedby="upload-hint"
                />
                <div className="flex flex-col items-center gap-3" aria-hidden="true">
                  <svg className="h-14 w-14 text-brand/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-lg font-medium text-stone-900">Drop a PDF here</span>
                  <span id="upload-hint" className="text-sm text-stone-500">or</span>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-stone-400" aria-hidden="true">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span>PDF only • Up to 20 MB</span>
                </div>
              </label>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-medium text-brand bg-brand-light rounded-lg hover:bg-brand/20 transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                  disabled={busy}
                  aria-label="Browse files to upload"
                >
                  Browse Files
                </button>
              </div>

              <p id="upload-hint" className="mt-4 text-center text-sm text-stone-500">
                Supported format: <code className="font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">.pdf</code>
                {", "}Maximum file size: <code className="font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">20 MB</code>
              </p>
            </>
          )}

          {status ? (
            <div className="mt-6 animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-sm font-medium text-stone-700">{status}</p>
                {phase.kind === "upload" && phase.percent !== null && (
                  <span className="text-sm font-mono text-brand">{phase.percent}%</span>
                )}
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase.kind === "upload" && phase.percent !== null ? phase.percent : undefined} aria-valuetext={status}>
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: phase.kind === "upload" && phase.percent !== null ? `${phase.percent}%` : "100%",
                  }}
                />
              </div>
              {phase.kind === "upload" && phase.percent === null && (
                <p className="mt-2 text-sm text-stone-500 flex items-center justify-center gap-1.5">
                  <span className="animate-pulse-soft" aria-hidden="true">●●●</span>
                  <span>Indexing document and preparing summary…</span>
                </p>
              )}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 p-4 rounded-xl bg-error-light border border-error/20 animate-fade-in" role="alert" aria-live="assertive">
              <div className="flex items-start gap-3">
                <svg className="flex-shrink-0 mt-0.5 h-5 w-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-center text-sm text-stone-400">
          By uploading a document, you agree to our{' '}
          <a href="#" className="text-brand hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-brand hover:underline">Privacy Policy</a>
          .
        </p>
      </div>
    </main>
  );
}

function HeaderWithNavigate() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white/95 backdrop-blur-lg supports-[backdrop-filter]:bg-white/80 px-4 sm:px-6 shadow-card">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden p-2 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
          onClick={() => navigate("/dashboard")}
          aria-label="Go to dashboard"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <a href="/" className="flex items-center gap-2" aria-label="Sophia AI - Home">
          <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="brandGradientHeader2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f26934" />
                <stop offset="100%" stopColor="#c44e22" />
              </linearGradient>
              <linearGradient id="accentGradientHeader2" x1="0" y1="16" x2="32" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f26934" />
                <stop offset="50%" stopColor="#ff8c42" />
                <stop offset="100%" stopColor="#f26934" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="15" stroke="url(#brandGradientHeader2)" strokeWidth="2" />
            <path d="M8 22C8 15.37 13.37 10 20 10C26.63 10 32 15.37 32 22" stroke="url(#accentGradientHeader2)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="8" cy="22" r="3" fill="url(#brandGradientHeader2)" />
            <circle cx="20" cy="10" r="2.5" fill="url(#accentGradientHeader2)" />
            <circle cx="32" cy="22" r="2" fill="url(#brandGradientHeader2)" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-stone-900">Sophia</span>
          <span className="text-xs font-medium text-brand hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-brand-light">AI</span>
        </a>
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-error hover:bg-error-light rounded-lg transition-colors focus:ring-2 focus:ring-error focus:ring-offset-2"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/upload" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/workspace" element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          } />
          <Route path="/workspace/:documentId" element={<WorkspacePage />} />
          <Route path="/papers" element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}