import { useState, type DragEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, rejectUpload, errorMessage } from "../api/client";
import type { Document } from "../api/types";

interface LandingPageProps {
}

export function LandingPage() {
  const navigate = useNavigate();
  const [over, setOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleFiles = (files: FileList | null | undefined) => {
    if (phase !== "idle") return;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setUploadError("Upload one PDF at a time.");
      return;
    }
    const problem = rejectUpload(files[0]);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setSelectedFile(files[0]);
    setUploadError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setPhase("uploading");
    setUploadError(null);
    try {
      const document = await uploadDocument(selectedFile, (loaded, total) => {
        const p = total > 0 ? Math.round((loaded / total) * 100) : 0;
        if (p >= 100) {
          setPhase("processing");
        } else {
          setPercent(p);
        }
      });
      // Navigate to workspace with document state for the viewer
      window.location.href = `/workspace/${document.id}`;
    } catch (reason) {
      setPhase("error");
      setUploadError(errorMessage(reason));
    }
  };

  const statusText = phase === "uploading"
    ? `Uploading ${selectedFile?.name}…`
    : phase === "processing"
      ? "Processing document and preparing summary…"
      : "";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand mb-6 shadow-card" aria-hidden="true">
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 text-balance">Turn Research Papers into Insights</h1>
          <p className="mt-4 text-lg sm:text-xl leading-relaxed text-stone-600 max-w-2xl mx-auto">
            Upload a PDF and Sophia AI will write a structured summary and answer questions grounded in its pages.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-6 sm:p-8 animate-slide-up">
          {/* Error Display */}
          {phase === "error" && uploadError && (
            <div className="mb-6 p-4 rounded-xl bg-error-light border border-error/20 animate-fade-in" role="alert" aria-live="assertive">
              <div className="flex items-start gap-3">
                <svg className="flex-shrink-0 mt-0.5 h-5 w-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-error">{uploadError}</p>
              </div>
              <button
                type="button"
                onClick={() => { setUploadError(null); setPhase("idle"); setSelectedFile(null); }}
                className="mt-3 text-xs font-medium text-brand hover:text-brand-dark"
              >
                Dismiss and try again
              </button>
            </div>
          )}

          {/* Selected File / Ready to Upload */}
          {selectedFile && phase === "idle" ? (
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
                  onClick={handleRemoveFile}
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
                onClick={handleUpload}
              >
                Upload and analyze
              </button>
            </div>
          ) : (
            <>
              {/* Drag and Drop Zone */}
              <label
                className={`relative block cursor-pointer border-2 border-dashed rounded-2xl bg-white px-6 py-12 sm:py-16 text-center transition-all duration-200 ${
                  over ? "border-brand bg-brand-light ring-2 ring-brand/20 scale-[1.01] shadow-card-hover" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={handleFileChange}
                  id="landing-pdf-upload"
                  aria-describedby="landing-upload-hint"
                />
                <div className="flex flex-col items-center gap-3" aria-hidden="true">
                  <svg className="h-14 w-14 text-brand/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="text-lg font-medium text-stone-900">Drop a PDF here</span>
                  <span id="landing-upload-hint" className="text-sm text-stone-500">or</span>
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
                  className="px-6 py-2.5 text-sm font-medium text-brand bg-brand-light rounded-lg hover:bg-brand/20 transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
                  onClick={() => document.getElementById('landing-pdf-upload')?.click()}
                  aria-label="Browse files to upload"
                >
                  Browse Files
                </button>
              </div>

              <p id="landing-upload-hint" className="mt-4 text-center text-sm text-stone-500">
                Supported format: <code className="font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">.pdf</code>
                {", "}Maximum file size: <code className="font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">20 MB</code>
              </p>
            </>
          )}

          {/* Upload Progress */}
          {phase === "uploading" && (
            <div className="mt-6 animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-sm font-medium text-stone-700">{statusText}</p>
                {percent !== null && <span className="text-sm font-mono text-brand">{percent}%</span>}
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} aria-valuetext={statusText}>
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${percent ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {phase === "processing" && (
            <div className="mt-6 animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-sm font-medium text-stone-700">{statusText}</p>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={undefined} aria-valuetext={statusText}>
                <div className="h-full bg-brand rounded-full animate-pulse" style={{ width: "100%" }} />
              </div>
              <p className="mt-2 text-sm text-stone-500 flex items-center justify-center gap-1.5">
                <span className="animate-pulse-soft" aria-hidden="true">●●●</span>
                <span>Indexing document and preparing summary…</span>
              </p>
            </div>
          )}
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