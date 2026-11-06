import { useEffect, useState } from "react";
import { createSummary, errorMessage } from "../api/client";
import { NOT_FOUND, SUMMARY_SECTIONS, type PaperSummary } from "../api/types";

interface SummarySectionProps {
  label: string;
  text: string;
}

export function SummarySection({ label, text }: SummarySectionProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const missing = text === NOT_FOUND;

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const copyLabel = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";

  return (
    <section className="border-t border-stone-200 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-stone-900">{label}</h3>
        <button
          type="button"
          onClick={() => void copy()}
          className="text-sm text-brand hover:text-brand-dark"
          aria-label={`${copyLabel} ${label}`}
        >
          {copyLabel}
        </button>
      </div>
      <p className={`mt-2 max-w-prose text-base leading-7 ${missing ? "text-stone-500" : "text-stone-900"}`}>
        {text}
      </p>
    </section>
  );
}

interface SummaryPanelProps {
  documentId: string;
  filename: string;
}

export function SummaryPanel({ documentId, filename }: SummaryPanelProps) {
  const [summary, setSummary] = useState<PaperSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSummary(null);
    void createSummary(documentId, controller.signal).then(
      (next) => {
        setSummary(next);
        setLoading(false);
      },
      (reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(errorMessage(reason));
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [documentId, attempt]);

  if (loading) {
    return (
      <p className="text-sm text-stone-600" role="status">
        Writing the summary. This can take a few minutes.
      </p>
    );
  }

  if (error || !summary) {
    return (
      <div role="alert">
        <p className="text-sm text-red-800">{error ?? "The summary could not be loaded."}</p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-brand hover:text-brand-dark"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  const title = summary.title === NOT_FOUND ? filename : summary.title;

  return (
    <article>
      <header className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">{title}</h2>
        {summary.authors !== NOT_FOUND ? (
          <p className="mt-1 max-w-prose text-sm leading-6 text-stone-600">{summary.authors}</p>
        ) : null}
      </header>
      {SUMMARY_SECTIONS.map((section) => (
        <SummarySection key={section.key} label={section.label} text={summary[section.key]} />
      ))}
    </article>
  );
}
