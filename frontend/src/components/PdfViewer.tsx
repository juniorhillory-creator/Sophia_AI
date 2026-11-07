import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";

GlobalWorkerOptions.workerSrc = workerUrl;

// shortcut: canvas has no text layer; add one if users need to select page text

interface PdfViewerProps {
  file: File;
  page: number;
  onPageChange: (page: number) => void;
}

export function PdfViewer({ file, page, onPageChange }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pageCount = pdf?.numPages ?? 0;
  const safePage = pageCount > 0 ? Math.min(Math.max(1, page), pageCount) : 1;

  useEffect(() => {
    let dead = false;
    let loaded: PDFDocumentProxy | null = null;
    let loading: { destroy: () => Promise<void> } | null = null;
    setPdf(null);
    setError(null);
    void (async () => {
      try {
        const buffer = await file.arrayBuffer();
        if (dead) return;
        const task = getDocument({ data: new Uint8Array(buffer) });
        loading = task;
        const doc = await task.promise;
        if (dead) {
          await doc.destroy();
          return;
        }
        loaded = doc;
        setPdf(doc);
      } catch {
        if (!dead) setError("This PDF could not be opened.");
      }
    })();
    return () => {
      dead = true;
      if (loaded) void loaded.destroy();
      else void loading?.destroy();
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
    void pdf.getPage(safePage).then(
      (pdfPage) => {
        if (dead) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = Math.max(width - 32, 280) / base.width;
        const viewport = pdfPage.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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
    return () => {
      dead = true;
      task?.cancel();
    };
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
      <div
        id="pdf-viewer"
        ref={frameRef}
        tabIndex={-1}
        aria-label={pageCount > 0 ? `PDF, page ${safePage} of ${pageCount}` : "PDF"}
        className="min-h-0 flex-1 overflow-auto px-4 py-6 outline-none"
      >
        {error ? (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : (
          <canvas ref={canvasRef} className="mx-auto border border-stone-300 bg-white" />
        )}
      </div>
    </div>
  );
}
