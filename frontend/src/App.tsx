import { useCallback, useState, type KeyboardEvent } from "react";
import { errorMessage, rejectUpload, uploadDocument } from "./api/client";
import type { Document } from "./api/types";
import { ChatPanel } from "./components/ChatPanel";
import { PdfViewer } from "./components/PdfViewer";
import { SummaryPanel } from "./components/SummaryPanel";

type Phase =
  | { kind: "idle" }
  | { kind: "upload"; filename: string; percent: number | null }
  | { kind: "ready"; document: Document; file: File };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"summary" | "chat">("summary");
  const openPage = useCallback((next: number) => {
    setPage(next);
    const viewer = document.getElementById("pdf-viewer");
    viewer?.scrollIntoView({ block: "nearest" });
    viewer?.focus();
  }, []);

  function reset() {
    setPhase({ kind: "idle" });
    setError(null);
    setPage(1);
    setTab("summary");
  }

  function takeFiles(list: FileList | null | undefined) {
    if (phase.kind === "upload") return;
    if (!list || list.length === 0) return;
    if (list.length > 1) {
      setError("Upload one PDF at a time.");
      return;
    }
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
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 sm:px-6">
        <p className="text-base font-semibold tracking-tight text-stone-900">Sophia</p>
        {phase.kind === "ready" ? (
          <div className="flex min-w-0 items-center gap-4">
            <p className="truncate text-sm text-stone-600">
              {phase.document.filename}
              <span className="text-stone-400"> · </span>
              {phase.document.page_count} {phase.document.page_count === 1 ? "page" : "pages"}
            </p>
            <button type="button" className="shrink-0 text-sm text-brand hover:text-brand-dark" onClick={reset}>
              New paper
            </button>
          </div>
        ) : null}
      </header>
      {phase.kind === "ready" ? (
        <main className="min-h-0 flex-1 overflow-auto lg:overflow-hidden">
          <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
            <section className="h-[70vh] shrink-0 border-b border-stone-200 lg:h-full lg:w-1/2 lg:shrink lg:border-b-0 lg:border-r" aria-label="Paper">
              <PdfViewer file={phase.file} page={page} onPageChange={setPage} />
            </section>
            <section className="flex min-h-[32rem] flex-col bg-white lg:h-full lg:min-h-0 lg:w-1/2">
              <div role="tablist" aria-label="Paper tools" className="flex shrink-0 gap-6 border-b border-stone-200 px-5" onKeyDown={onTabKey}>
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
                  className="h-full overflow-auto px-5 py-5"
                >
                  <SummaryPanel documentId={phase.document.id} filename={phase.document.filename} />
                </div>
                <div
                  role="tabpanel"
                  id="panel-chat"
                  aria-labelledby="tab-chat"
                  hidden={tab !== "chat"}
                  className="h-full px-5 py-5"
                >
                  <ChatPanel documentId={phase.document.id} onOpenPage={openPage} />
                </div>
              </div>
            </section>
          </div>
        </main>
      ) : (
        <UploadScreen phase={phase} error={error} onFiles={takeFiles} />
      )}
    </div>
  );

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
      className={`border-b-2 py-3 text-sm ${selected ? "border-brand font-medium text-stone-900" : "border-transparent text-stone-500"}`}
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
}: {
  phase: Exclude<Phase, { kind: "ready" }>;
  error: string | null;
  onFiles: (files: FileList | null | undefined) => void;
}) {
  const [over, setOver] = useState(false);
  const busy = phase.kind === "upload";
  const status =
    phase.kind === "upload"
      ? phase.percent === null
        ? `Indexing ${phase.filename}`
        : `Uploading ${phase.filename}, ${phase.percent}%`
      : null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Read a paper</h1>
        <p className="mt-2 text-base leading-7 text-stone-600">
          Upload a PDF. Sophia writes a summary and answers from its pages.
        </p>
        <label
          className={`mt-8 block cursor-pointer border border-dashed bg-white px-6 py-16 text-center has-[:focus-visible]:border-brand ${over ? "border-brand" : "border-stone-300"} ${busy ? "pointer-events-none opacity-60" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            onFiles(event.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              onFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <span className="block text-base font-medium text-stone-900">Drop a PDF here</span>
          <span className="mt-1 block text-sm text-stone-600">or choose a file. Maximum 20 MB.</span>
        </label>
        {status ? (
          <div className="mt-4" role="status">
            <p className="text-sm text-stone-700">{status}</p>
            <div
              className="mt-2 h-1 bg-stone-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={phase.kind === "upload" && phase.percent !== null ? phase.percent : undefined}
              aria-valuetext={status}
            >
              <div
                className="h-1 bg-brand"
                style={{ width: phase.kind === "upload" && phase.percent !== null ? `${phase.percent}%` : "100%" }}
              />
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
