import { useEffect, useId, useRef, useState } from "react";
import { askQuestion, askQuestionStream, errorMessage, INSUFFICIENT, type SSEChunk } from "../api/client";
import { type SourceCitation } from "../api/types";

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
  streaming?: boolean;
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError(null);
    setPending(false);
  }, [documentId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  function nextId(): string {
    sequence.current += 1;
    return String(sequence.current);
  }

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    
    const userMsgId = nextId();
    setMessages((current) => [...current, { id: userMsgId, role: "user", content: trimmed }]);
    setDraft("");
    setPending(true);
    setError(null);
    
    // Cancel any previous stream
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantMsgId = nextId();
    setMessages((current) => [...current, { 
      id: assistantMsgId, 
      role: "assistant", 
      content: "", 
      sources: [],
      streaming: true 
    }]);

    try {
      let fullContent = "";
      let citations: SourceCitation[] = [];
      
      for await (const chunk of askQuestionStream(documentId, trimmed, abortController.signal)) {
        if (chunk.type === "content") {
          fullContent += chunk.text;
          setMessages((current) => current.map((msg) => 
            msg.id === assistantMsgId ? { ...msg, content: fullContent } : msg
          ));
        } else if (chunk.type === "citations") {
          // Update the last message with citations
          setMessages((current) => current.map((msg) => 
            msg.id === assistantMsgId ? { ...msg, sources: chunk.citations, streaming: false } : msg
          ));
        }
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") {
        // Ignore aborted requests
        return;
      }
      setError(errorMessage(reason));
      setMessages((current) => current.map((msg) => 
        msg.id === assistantMsgId ? { ...msg, content: errorMessage(reason), streaming: false } : msg
      ));
    } finally {
      setPending(false);
    }
  }

  function abortStream() {
    abortControllerRef.current?.abort();
    setPending(false);
    // Remove the streaming message if it was the last one
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        return current.slice(0, -1);
      }
      return current;
    });
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
                  className="border border-stone-300 bg-white px-3 py-2.5 text-left text-sm text-stone-800 hover:border-brand focus:ring-2 focus:ring-brand focus:ring-offset-2"
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
                  {message.streaming && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                      <span className="text-stone-500">Streaming…</span>
                    </div>
                  )}
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
                              className="text-left focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded"
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
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending && draft.trim().length > 0) {
            void send(draft);
          }
        }}
        className="mt-4 flex gap-2 border-t border-stone-200 pt-4"
      >
        <label className="sr-only" htmlFor={inputId}>
          Question
        </label>
        <input
          id={inputId}
          value={draft}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a question about this paper..."
          className="min-w-0 flex-1 border border-stone-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand focus:ring-offset-2"
          disabled={pending}
        />
        {pending ? (
          <button
            type="button"
            className="bg-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-300 focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors"
            onClick={abortStream}
            aria-label="Stop streaming"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:bg-stone-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors"
            disabled={draft.trim().length === 0}
          >
            Ask
          </button>
        )}
      </form>
    </div>
  );
}
