import { useEffect, useState } from "react";
import type { Document, PaperSummary, SourceCitation } from "../../api/types";
import { ApiError, askQuestion, createSummary, errorMessage, getSummary } from "../../api/client";

interface ReferenceDrawerProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onInsertText: (text: string) => void;
}

export function ReferenceDrawer({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onInsertText,
}: ReferenceDrawerProps) {
  const [tab, setTab] = useState<"summary" | "ask">("summary");
  const [summary, setSummary] = useState<PaperSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Q&A state
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaSources, setQaSources] = useState<SourceCitation[]>([]);
  const [qaError, setQaError] = useState<string | null>(null);

  // Load summary whenever document is selected
  const handleLoadSummary = async (docId: string) => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      try {
        const cached = await getSummary(docId);
        setSummary(cached);
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
          const fresh = await createSummary(docId);
          setSummary(fresh);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setSummaryError(errorMessage(err));
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (selectedDocumentId) {
      void handleLoadSummary(selectedDocumentId);
    } else {
      setSummary(null);
    }
  }, [selectedDocumentId]);

  const handleDocumentChange = (id: string) => {
    onSelectDocument(id);
    setQaAnswer(null);
    setQaSources([]);
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocumentId || !question.trim() || asking) return;
    setAsking(true);
    setQaError(null);
    try {
      const response = await askQuestion(selectedDocumentId, question.trim());
      setQaAnswer(response.answer);
      setQaSources(response.sources);
    } catch (err) {
      setQaError(errorMessage(err));
    } finally {
      setAsking(false);
    }
  };

  const handleInsertQa = () => {
    if (!qaAnswer) return;
    const citationTag = qaSources.length > 0 ? ` (Page ${qaSources.map((s) => s.page).join(", ")})` : "";
    onInsertText(`\n> "${qaAnswer}"${citationTag}\n\n`);
  };

  return (
    <aside className="flex h-full w-80 sm:w-96 flex-col border-l border-stone-200 bg-white shadow-lg animate-slide-up">
      {/* Drawer Header & Source Paper Selector */}
      <div className="border-b border-stone-200 p-3.5 bg-stone-50/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Source Research Paper</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            100% Grounded
          </span>
        </div>

        <select
          value={selectedDocumentId || ""}
          onChange={(e) => handleDocumentChange(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 shadow-xs focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">— Select a paper to cite —</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.filename} ({doc.page_count} pages)
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 bg-white px-3 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={`border-b-2 py-2.5 px-3 transition-colors ${
            tab === "summary" ? "border-brand text-brand font-semibold" : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Structured Summary
        </button>
        <button
          type="button"
          onClick={() => setTab("ask")}
          className={`border-b-2 py-2.5 px-3 transition-colors ${
            tab === "ask" ? "border-brand text-brand font-semibold" : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Ask Paper (RAG)
        </button>
      </div>

      {/* Drawer Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin text-xs">
        {!selectedDocumentId ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4 text-stone-400">
            <svg className="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="font-medium text-stone-600">No paper selected</p>
            <p className="text-[11px] mt-1">Choose a paper above to access its methodology, findings, and verified citations.</p>
          </div>
        ) : tab === "summary" ? (
          loadingSummary ? (
            <div className="space-y-4 py-8 text-center text-stone-500">
              <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p>Analyzing paper structure...</p>
            </div>
          ) : summaryError ? (
            <div className="rounded-lg bg-red-50 p-3 text-red-700">
              <p>{summaryError}</p>
              <button
                type="button"
                onClick={() => handleLoadSummary(selectedDocumentId)}
                className="mt-2 text-xs font-semibold text-brand underline"
              >
                Retry
              </button>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-stone-400">Title</p>
                <p className="font-semibold text-stone-900 mt-0.5">{summary.title}</p>
              </div>

              {[
                { label: "Abstract", val: summary.abstract },
                { label: "Problem Statement", val: summary.problem_statement },
                { label: "Methodology", val: summary.methodology },
                { label: "Key Results", val: summary.key_results },
                { label: "Conclusion", val: summary.conclusion },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-lg border border-stone-200 bg-stone-50/50 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-stone-800">{label}</span>
                    <button
                      type="button"
                      onClick={() => onInsertText(`\n### ${label}\n${val}\n\n`)}
                      className="text-[11px] font-medium text-brand hover:text-brand-dark"
                    >
                      + Insert
                    </button>
                  </div>
                  <p className="text-stone-600 leading-relaxed text-[11px]">{val}</p>
                </div>
              ))}
            </div>
          ) : null
        ) : (
          /* Ask Paper (RAG) Tab */
          <div className="flex flex-col h-full space-y-3">
            <form onSubmit={handleAskQuestion} className="space-y-2">
              <label htmlFor="rag-query-input" className="block text-[11px] font-medium text-stone-600">
                Ask a research question about this paper:
              </label>
              <input
                id="rag-query-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What dataset did they use?"
                disabled={asking}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="w-full rounded-lg bg-brand py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-40 transition-colors"
              >
                {asking ? "Searching paper passages..." : "Query Paper"}
              </button>
            </form>

            {qaError && (
              <div className="rounded-lg bg-red-50 p-2.5 text-red-700">
                {qaError}
              </div>
            )}

            {qaAnswer && (
              <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-xs space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900">Answer</span>
                  <button
                    type="button"
                    onClick={handleInsertQa}
                    className="rounded bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                  >
                    + Insert with citation
                  </button>
                </div>
                <p className="text-stone-700 leading-relaxed text-xs">{qaAnswer}</p>

                {qaSources.length > 0 && (
                  <div className="border-t border-stone-100 pt-2 space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-stone-400">Sources</p>
                    {qaSources.map((s, idx) => (
                      <div key={idx} className="rounded bg-stone-50 p-1.5 text-[11px]">
                        <span className="font-mono font-medium text-brand">Page {s.page}: </span>
                        <span className="text-stone-600 italic">"{s.excerpt}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

