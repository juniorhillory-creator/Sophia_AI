interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div
      className={`animate-pulse bg-stone-200 rounded-md ${className ?? ""}`}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          className={`h-4 w-${i === lines - 1 ? "60" : "100"} ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}