import { API_BASE, ACCESS_TOKEN_KEY } from "./axiosInstance";
import type { SourceCitation } from "../types";

export interface StreamChatOptions {
  documentId: string;
  question: string;
  onChunk: (chunk: string) => void;
  onCitations?: (citations: SourceCitation[]) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

export type StreamCallbacks = Partial<Omit<StreamChatOptions, "documentId" | "question">>;

export async function streamQuestion(
  documentIdOrOptions: string | StreamChatOptions,
  questionOrCallbacks?: string | StreamCallbacks,
  optionalCallbacks?: StreamCallbacks
): Promise<void> {
  let docId: string;
  let qText: string;
  let callbacks: StreamCallbacks = {};

  if (typeof documentIdOrOptions === "string") {
    docId = documentIdOrOptions;
    qText = (questionOrCallbacks as string) || "";
    callbacks = optionalCallbacks || {};
  } else {
    docId = documentIdOrOptions.documentId;
    qText = documentIdOrOptions.question;
    callbacks = documentIdOrOptions;
  }

  const { onChunk, onCitations, onError, onComplete, onDone, signal } = callbacks;
  const finish = onDone || onComplete;

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const url = `${API_BASE}/api/v1/documents/${docId}/questions/stream?question=${encodeURIComponent(
    qText
  )}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });

    if (!response.ok) {
      let errText = "";
      try {
        const errJson = await response.json();
        errText = errJson.detail || errJson.message || `Server error (${response.status})`;
      } catch {
        errText = `Request failed with status ${response.status}`;
      }
      throw new Error(errText);
    }

    if (!response.body) {
      throw new Error("No readable stream received from server.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const dataContent = trimmed.replace(/^data:\s*/, "");

        // Check for citations payload: [CITATIONS][{...}]
        if (dataContent.startsWith("[CITATIONS]")) {
          const jsonStr = dataContent.replace(/^\[CITATIONS\]/, "");
          try {
            const citations = JSON.parse(jsonStr) as SourceCitation[];
            onCitations?.(citations);
          } catch (e) {
            console.warn("Failed to parse citations payload:", e);
          }
        } else if (dataContent === "[DONE]") {
          // Stream completed
          break;
        } else {
          // Text token chunk
          onChunk?.(dataContent);
        }
      }
    }

    finish?.();
  } catch (error: unknown) {
    if (onError && error instanceof Error) {
      onError(error);
    } else {
      throw error;
    }
  }
}

export const chatApi = {
  streamQuestion,
};
