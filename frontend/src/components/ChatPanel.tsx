import { useEffect, useId, useRef, useState } from "react";
import { askQuestion, errorMessage } from "../api/client";
import { INSUFFICIENT, type SourceCitation } from "../api/types";

const SUGGESTED_QUESTIONS = [
  "What problem does this paper address?",
  "What method do the authors use?",
  "What are the main results?",
] as const;

interface UserMessage {
  id: string;
  role: "user";
  content: string;
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  content: string;
  sources: SourceCitation[];
}

type ChatMessage = UserMessage | AssistantMessage;

interface ChatPanelProps {
  documentId: string;
  onOpenPage: (page: number) => void;
}

export function ChatPanel({ documentId, onOpenPage }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const inputId = useId();

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError(null);
    setPending(false);
  }, [documentId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending, error]);

  function nextId(): string {
    sequence.current += 1;
    return String(sequence.current);
  }

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setMessages((current) => [...current, { id: nextId(), role: "user", content: trimmed }]);
    setDraft("");
    setPending(true);
    setError(null);
    try {
      const response = await askQuestion(documentId, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
        },
      ]);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-[12rem] flex-1 overflow-auto lg:min-h-0" aria-live="polite">
        {messages.length === 0 && !pending ? (
          <div>
            <p className="text-sm text-stone-600">Ask about this paper. Answers come from its pages.</p>
            <div className="mt-4 flex flex-col items-start gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-800 hover:border-brand"
                  onClick={() => void send(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {message.role === "user" ? (
                <p className="max-w-prose bg-brand px-3 py-2 text-sm leading-6 text-white">{message.content}</p>
              ) : (
                <div className="max-w-prose border border-stone-200 bg-white px-3 py-2">
                  <p
                    className={`text-sm leading-6 ${message.content === INSUFFICIENT ? "text-stone-600" : "text-stone-900"}`}
                  >
                    {message.content}
                  </p>
                  {message.sources.length > 0 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-stone-600">
                        Sources ({message.sources.length})
                      </summary>
                      <ul className="mt-2 flex flex-col gap-2">
                        {message.sources.map((source, index) => (
                          <li key={`${source.chunk_id}-${index}`}>
                            <button
                              type="button"
                              className="text-left"
                              onClick={() => onOpenPage(source.page)}
                            >
                              <span className="text-sm font-medium text-brand">Page {source.page}</span>
                              <span className="mt-0.5 block text-sm leading-5 text-stone-600">{source.excerpt}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
        {pending ? (
          <p className="mt-3 text-sm text-stone-600" role="status">
            Searching the paper.
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <form
        className="mt-4 flex gap-2 border-t border-stone-200 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Question
        </label>
        <input
          id={inputId}
          value={draft}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a question"
          className="min-w-0 flex-1 border border-stone-300 bg-white px-3 py-2 text-sm"
          disabled={pending}
        />
        <button
          type="submit"
          className="bg-brand px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={pending || draft.trim().length === 0}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
