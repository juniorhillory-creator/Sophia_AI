import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";

GlobalWorkerOptions.workerSrc = workerUrl;

<<<<<<< HEAD
interface PdfViewerProps {
  file: File | Blob;
  page: number;
  onPageChange: (page: number) => void;
  filename?: string;
}

export function PdfViewer({ file, page, onPageChange, filename }: PdfViewerProps) {
=======
// shortcut: canvas has no text layer; add one if users need to select page text

interface PdfViewerProps {
  file: File;
  page: number;
  onPageChange: (page: number) => void;
}

export function PdfViewer({ file, page, onPageChange }: PdfViewerProps) {
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);
<<<<<<< HEAD
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

=======
  const [error, setError] = useState<string | null>(null);
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
  const pageCount = pdf?.numPages ?? 0;
  const safePage = pageCount > 0 ? Math.min(Math.max(1, page), pageCount) : 1;

  useEffect(() => {
    let dead = false;
    let loaded: PDFDocumentProxy | null = null;
<<<<<<< HEAD
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    setPdf(null);
    setError(null);
    setLoading(true);

=======
    let loading: { destroy: () => Promise<void> } | null = null;
    setPdf(null);
    setError(null);
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
    void (async () => {
      try {
        const buffer = await file.arrayBuffer();
        if (dead) return;
        const task = getDocument({ data: new Uint8Array(buffer) });
<<<<<<< HEAD
        loadingTask = task;
=======
        loading = task;
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
        const doc = await task.promise;
        if (dead) {
          await doc.destroy();
          return;
        }
        loaded = doc;
        setPdf(doc);
<<<<<<< HEAD
        setLoading(false);
      } catch {
        if (!dead) {
          setError("This PDF could not be opened.");
          setLoading(false);
        }
      }
    })();

    return () => {
      dead = true;
      if (loaded) void loaded.destroy();
      else void loadingTask?.destroy();
=======
      } catch {
        if (!dead) setError("This PDF could not be opened.");
      }
    })();
    return () => {
      dead = true;
      if (loaded) void loaded.destroy();
      else void loading?.destroy();
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
    };
  }, [file]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => setWidth(frame.clientWidth));
    observer.observe(frame);
    setWidth(frame.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pageCount > 0 && page !== safePage) onPageChange(safePage);
  }, [page, pageCount, safePage, onPageChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdf || width < 1) return;
    let dead = false;
    let task: RenderTask | null = null;
<<<<<<< HEAD

=======
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
    void pdf.getPage(safePage).then(
      (pdfPage) => {
        if (dead) return;
        const base = pdfPage.getViewport({ scale: 1 });
<<<<<<< HEAD
        const baseScale = Math.max(width - 48, 280) / base.width;
        const scale = baseScale * zoomMultiplier;
        const viewport = pdfPage.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;

=======
        const scale = Math.max(width - 32, 280) / base.width;
        const viewport = pdfPage.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
<<<<<<< HEAD

        const context = canvas.getContext("2d");
        if (!context) return;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

=======
        const context = canvas.getContext("2d");
        if (!context) return;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
        task = pdfPage.render({ canvasContext: context, viewport });
        return task.promise.catch((renderError: unknown) => {
          if (dead) return;
          const name = renderError instanceof Error ? renderError.name : "";
          if (name === "RenderingCancelledException") return;
          setError("This page could not be drawn.");
        });
      },
      () => {
        if (!dead) setError("This page could not be drawn.");
      },
    );
<<<<<<< HEAD

=======
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
    return () => {
      dead = true;
      task?.cancel();
    };
<<<<<<< HEAD
  }, [pdf, safePage, width, zoomMultiplier]);

  const handleZoomIn = () => setZoomMultiplier((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomMultiplier((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomMultiplier(1);

  return (
    <div className="flex h-full min-h-0 flex-col bg-stone-100/70 select-none">
      {/* SciSpace-style toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 py-2 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="max-w-[200px] truncate text-xs font-medium text-stone-600 sm:max-w-[260px]" title={filename}>
              {filename}
            </span>
          )}
          <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-mono font-medium text-stone-700">
            {pageCount > 0 ? `Page ${safePage} / ${pageCount}` : "Loading..."}
          </span>
        </div>

        {/* Page navigation & Zoom controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
              onClick={() => onPageChange(safePage - 1)}
              disabled={pageCount === 0 || safePage <= 1}
              aria-label="Previous Page"
              title="Previous Page"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="px-2 text-xs font-mono text-stone-700">
              {safePage}
            </span>
            <button
              type="button"
              className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
              onClick={() => onPageChange(safePage + 1)}
              disabled={pageCount === 0 || safePage >= pageCount}
              aria-label="Next Page"
              title="Next Page"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
              onClick={handleZoomOut}
              disabled={zoomMultiplier <= 0.5}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 text-[11px] font-mono text-stone-600 hover:bg-stone-100 rounded"
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              {Math.round(zoomMultiplier * 100)}%
            </button>
            <button
              type="button"
              className="rounded p-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
              onClick={handleZoomIn}
              disabled={zoomMultiplier >= 2.5}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Canvas Viewport */}
=======
  }, [pdf, safePage, width]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#efece8]">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2">
        <p className="text-sm text-stone-600">
          {pageCount > 0 ? `Page ${safePage} of ${pageCount}` : "Opening PDF"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm text-stone-800 disabled:text-stone-400 rounded-lg hover:bg-stone-100 focus:ring-2 focus:ring-brand focus:ring-offset-2"
            onClick={() => onPageChange(safePage - 1)}
            disabled={pageCount === 0 || safePage <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm text-stone-800 disabled:text-stone-400 rounded-lg hover:bg-stone-100 focus:ring-2 focus:ring-brand focus:ring-offset-2"
            onClick={() => onPageChange(safePage + 1)}
            disabled={pageCount === 0 || safePage >= pageCount}
          >
            Next
          </button>
        </div>
      </div>
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
      <div
        id="pdf-viewer"
        ref={frameRef}
        tabIndex={-1}
<<<<<<< HEAD
        aria-label={pageCount > 0 ? `PDF, page ${safePage} of ${pageCount}` : "PDF Viewer"}
        className="min-h-0 flex-1 overflow-auto p-4 sm:p-6 outline-none scrollbar-thin"
      >
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm font-medium">Opening scientific manuscript...</p>
          </div>
        )}
        {error ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={`mx-auto rounded-sm border border-stone-300/80 bg-white shadow-md transition-shadow hover:shadow-lg ${
              loading ? "hidden" : "block"
            }`}
          />
=======
        aria-label={pageCount > 0 ? `PDF, page ${safePage} of ${pageCount}` : "PDF"}
        className="min-h-0 flex-1 overflow-auto px-4 py-6 outline-none"
      >
        {error ? (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : (
          <canvas ref={canvasRef} className="mx-auto border border-stone-300 bg-white" />
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
        )}
      </div>
    </div>
  );
}
