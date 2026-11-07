import { useState } from "react";
import { deleteDocument, errorMessage } from "../api/client";

interface DocumentCardProps {
  document: {
    id: string;
    filename: string;
    page_count: number;
    chunk_count: number;
    created_at: string;
  };
  status: "idle" | "processing" | "completed" | "failed";
  error: string | null;
  onOpen: (documentId: string) => void;
  onDelete: (documentId: string) => void;
  onRetry?: () => void;
}

export function DocumentCard({
  document,
  status,
  error,
  onOpen,
  onDelete,
  onRetry,
}: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false);

  const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    idle: { label: "Uploading", color: "text-stone-600", bg: "bg-stone-100", dot: "bg-stone-400" },
    processing: { label: "Processing", color: "text-brand", bg: "bg-brand-light", dot: "bg-brand" },
    completed: { label: "Completed", color: "text-success", bg: "bg-success-light", dot: "bg-success" },
    failed: { label: "Failed", color: "text-error", bg: "bg-error-light", dot: "bg-error" },
  };

  const config = statusConfig[status];

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDeleting(true);
    try {
      await deleteDocument(document.id);
      onDelete(document.id);
    } catch (reason) {
      setDeleting(false);
      throw reason;
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <article
      className="group border border-stone-200 rounded-xl bg-white p-5 hover:border-stone-300 hover:shadow-card transition-all cursor-pointer"
      onClick={() => onOpen(document.id)}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 ${config.bg} ${config.color} text-xs font-medium px-2 py-1 rounded-full`}>
              <span className={`h-2 w-2 rounded-full ${config.dot}`} aria-hidden="true" />
              {config.label}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-stone-900 truncate">
            {document.filename}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {document.page_count} pages • {document.chunk_count} chunks
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Uploaded {formatDate(document.created_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="p-2 text-stone-400 rounded-lg hover:bg-stone-100 hover:text-stone-600 transition-colors disabled:opacity-50"
          disabled={deleting}
          aria-label={`Delete ${document.filename}`}
        >
          {deleting ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {status === "failed" && error && (
        <div className="mt-3 p-3 rounded-lg bg-error-light border border-error/20">
          <p className="text-sm text-error">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-xs font-medium text-brand hover:text-brand-dark"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {status === "completed" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-success">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Summary available</span>
        </div>
      )}
    </article>
  );
}