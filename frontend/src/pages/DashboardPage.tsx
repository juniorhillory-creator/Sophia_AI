import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { uploadDocument, rejectUpload, errorMessage } from "../api/client";
import type { Document } from "../api/types";
import { Sidebar } from "../components/Sidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { DocumentCard } from "../components/DocumentCard";
import { EmptyState, LoadingSkeleton } from "../components/EmptyState";

export function DashboardPage({ initialDocument }: { initialDocument?: Document } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(initialDocument ? [initialDocument] : []);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const problem = rejectUpload(files[0]);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setSelectedFile(files[0]);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      const document = await uploadDocument(selectedFile, (loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        if (percent >= 100) {
          setUploadStatus("processing");
        }
      });
      setDocuments((prev) => {
        const exists = prev.find((d) => d.id === document.id);
        if (exists) return prev;
        return [document, ...prev];
      });
      setSelectedFile(null);
      setUploadStatus("success");
      navigate(`/workspace/${document.id}`, { state: { document, file: selectedFile } });
    } catch (reason) {
      setUploadStatus("error");
      setUploadError(errorMessage(reason));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadStatus("idle");
  };

  const handleOpenDocument = (documentId: string) => {
    navigate(`/workspace/${documentId}`);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  };

  const handleRetryDocument = (documentId: string) => {
    setDocumentErrors((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  };

  const getDocumentStatus = (documentId: string): "idle" | "processing" | "completed" | "failed" => {
    if (documentErrors[documentId]) return "failed";
    return "completed";
  };

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      <DashboardHeader onCollapseToggle={() => setCollapsed((prev) => !prev)} />

      <div className="flex flex-1">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activePath="/dashboard" />

        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${collapsed ? "md:pl-0" : "md:pl-64"}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-stone-900">
                  Welcome back,{user?.full_name ? " " + user.full_name.split(" ")[0] : ""}
                </h1>
                <p className="text-sm text-stone-500 mt-1">
                  Manage your research papers and ask questions with Sophia AI.
                </p>
              </div>
              <div className="mt-4 lg:mt-0 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById('dashboard-file-input')?.click()}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
                >
                  Upload Research Paper
                </button>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  id="dashboard-file-input"
                  onChange={(event) => handleFileSelect(event.target.files)}
                />
              </div>
            </div>

            {uploadStatus === "error" && uploadError && (
              <div className="mb-6 p-4 rounded-xl bg-error-light border border-error/20">
                <div className="flex items-start gap-3">
                  <svg className="flex-shrink-0 mt-0.5 h-5 w-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-error">Upload failed</h3>
                    <p className="text-xs text-stone-600 mt-1">{uploadError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setUploadError(null); setUploadStatus("idle"); }}
                  className="mt-3 text-xs font-medium text-brand hover:text-brand-dark"
                >
                  Dismiss
                </button>
              </div>
            )}

            {selectedFile && uploadStatus !== "success" && (
              <div className="mb-6 border border-stone-200 rounded-xl bg-white p-5 shadow-card">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 text-stone-500 rounded-lg hover:bg-stone-200 hover:text-stone-700 transition-colors"
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
                  onClick={handleUpload}
                  disabled={uploadStatus === "uploading" || uploadStatus === "processing"}
                  className="mt-4 w-full py-3 text-base font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadStatus === "uploading" ? "Uploading…" : uploadStatus === "processing" ? "Processing…" : "Upload and analyze"}
                </button>
                {uploadStatus === "processing" && (
                  <div className="mt-3 space-y-2">
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all duration-300 ease-out w-2/3" />
                    </div>
                    <p className="text-xs text-stone-500 text-center">Indexing document and preparing summary…</p>
                  </div>
                )}
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">Recent Documents</h2>
              </div>

              {uploadStatus === "uploading" || uploadStatus === "processing" ? (
                <LoadingSkeleton count={2} />
              ) : null}

              {documents.length === 0 && uploadStatus === "idle" && !selectedFile ? (
                <EmptyState
                  title="No documents yet"
                  description="Upload your first research paper to get started. Sophia will generate a structured summary and answer questions about its contents."
                  actionLabel="Upload Research Paper"
                  onAction={() => navigate("/upload")}
                />
              ) : null}

              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((document) => {
                    const status = getDocumentStatus(document.id);
                    const error = documentErrors[document.id] ?? null;
                    return (
                      <DocumentCard
                        key={document.id}
                        document={document}
                        status={status}
                        error={error}
                        onOpen={handleOpenDocument}
                        onDelete={handleDeleteDocument}
                        onRetry={() => handleRetryDocument(document.id)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}