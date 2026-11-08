import { SkeletonLoader } from "./SkeletonLoader";

interface EmptyStateProps {
<<<<<<< HEAD
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onUploadClick?: () => void;
=======
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
  icon?: React.ReactNode;
}

export function EmptyState({
<<<<<<< HEAD
  title = "No research papers yet",
  description = "Upload your first research paper to generate summaries and ask questions.",
  actionLabel = "Upload a paper",
  onAction,
  onUploadClick,
  icon,
}: EmptyStateProps) {
  const handleAction = onAction || onUploadClick;

=======
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon ?? (
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-4" aria-hidden="true">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
      )}
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm text-stone-500 max-w-xs">{description}</p>
<<<<<<< HEAD
      {actionLabel && handleAction && (
        <button
          type="button"
          onClick={handleAction}
=======
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
          className="mt-6 px-6 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-5 border border-stone-200 rounded-xl bg-white">
          <SkeletonLoader className="h-12 w-12 rounded-lg" />
          <div className="flex-1">
            <div className="space-y-3">
              <SkeletonLoader className="h-4 w-3/4" />
              <SkeletonLoader className="h-4 w-full" />
              <SkeletonLoader className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
