/// <reference types="vite/client" />

declare module "pdfjs-dist" {
  export interface PDFPageProxy {
    getViewport(params: { scale: number }): {
      width: number;
      height: number;
    };
    render(params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }): RenderTask;
  }

  export interface RenderTask {
    promise: Promise<void>;
    cancel(): void;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): Promise<void>;
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
    destroy(): Promise<void>;
  }

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(src: { data: Uint8Array } | string): PDFDocumentLoadingTask;
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const url: string;
  export default url;
}
