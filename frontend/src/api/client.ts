import type {
  ChatResponse,
  Document,
  ErrorBody,
  Manuscript,
  ManuscriptCreate,
  ManuscriptUpdate,
  PaperSummary,
  SourceCitation,
} from "./types";

export const INSUFFICIENT = "The paper does not contain sufficient information.";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const rawBase = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
export const API_BASE = rawBase.endsWith("/api/v1")
  ? rawBase.slice(0, -"/api/v1".length)
  : rawBase;

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const headers = new Headers(extra);
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  return headers;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function rejectUpload(file: File): string | null {
  const pdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!pdf) return "Only PDF files can be uploaded.";
  if (file.size < 1) return "The file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "PDF exceeds the 20 MB upload limit.";
  return null;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Could not reach the server.";
  return "Something went wrong.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    value.code.length > 0 &&
    typeof value.message === "string" &&
    value.message.length > 0
  );
}

export function toApiError(status: number, payload: unknown): ApiError {
  if (isErrorBody(payload)) return new ApiError(status, payload.code, payload.message);
  if (status === 0) return new ApiError(0, "network_error", "Could not reach the server.");
  return new ApiError(status, "http_error", "Request failed.");
}

function isDocument(value: unknown): value is Document {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.filename === "string" &&
    typeof value.page_count === "number" &&
    typeof value.chunk_count === "number" &&
    typeof value.created_at === "string"
  );
}

function isPaperSummary(value: unknown): value is PaperSummary {
  if (!isRecord(value)) return false;
  const keys = [
    "title",
    "authors",
    "abstract",
    "problem_statement",
    "methodology",
    "key_results",
    "conclusion",
  ] as const;
  return keys.every((key) => typeof value[key] === "string" && value[key].length > 0);
}

function isCitation(value: unknown): value is SourceCitation {
  return (
    isRecord(value) &&
    typeof value.page === "number" &&
    value.page >= 1 &&
    typeof value.excerpt === "string" &&
    value.excerpt.length > 0 &&
    typeof value.chunk_id === "string" &&
    value.chunk_id.length > 0
  );
}

function isChatResponse(value: unknown): value is ChatResponse {
  return (
    isRecord(value) &&
    typeof value.answer === "string" &&
    value.answer.length > 0 &&
    typeof value.document_id === "string" &&
    Array.isArray(value.sources) &&
    value.sources.every(isCitation)
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function uploadDocument(
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/v1/documents`);
    xhr.responseType = "text";
    if (authToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onerror = () => reject(new ApiError(0, "network_error", "Could not reach the server."));
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? (JSON.parse(xhr.responseText) as unknown) : null;
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(toApiError(xhr.status, payload));
        return;
      }
      if (!isDocument(payload)) {
        reject(new ApiError(xhr.status, "malformed_response", "The server returned an unreadable document."));
        return;
      }
      resolve(payload);
    };
    const body = new FormData();
    const pdf =
      file.type === "application/pdf" ? file : new File([file], file.name, { type: "application/pdf" });
    body.append("file", pdf, file.name);
    xhr.send(body);
  });
}

export async function createSummary(documentId: string, signal?: AbortSignal): Promise<PaperSummary> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}/summary`, {
    method: "POST",
    headers: authHeaders(),
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!isPaperSummary(payload)) {
    throw new ApiError(response.status, "malformed_response", "The server returned an unreadable summary.");
  }
  return payload;
}

export async function getSummary(documentId: string, signal?: AbortSignal): Promise<PaperSummary> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}/summary`, {
    headers: authHeaders(),
    signal,
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!isPaperSummary(payload)) {
    throw new ApiError(response.status, "malformed_response", "The server returned an unreadable summary.");
  }
  return payload;
}

export async function askQuestion(documentId: string, question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}/questions`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ question } satisfies { question: string }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!isChatResponse(payload)) {
    throw new ApiError(response.status, "malformed_response", "The server returned an unreadable answer.");
  }
  return payload;
}

export type SSEChunk =
  | { type: "content"; text: string }
  | { type: "citations"; citations: SourceCitation[] }
  | { type: "done" }
  | { type: "error"; message: string };

export async function* askQuestionStream(
  documentId: string,
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEChunk, void, unknown> {
  const response = await fetch(
    `${API_BASE}/api/v1/documents/${documentId}/questions/stream?question=${encodeURIComponent(question)}`,
    {
      method: "GET",
      headers: authHeaders({ Accept: "text/event-stream" }),
      signal,
    },
  );
  if (!response.ok) {
    const payload = await readJson(new Response(await response.text()));
    throw toApiError(response.status, payload);
  }
  if (!response.body) throw new ApiError(response.status, "stream_error", "No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        if (data === INSUFFICIENT) {
          yield { type: "content", text: INSUFFICIENT };
          return;
        }
        if (data.startsWith("[CITATIONS]")) {
          const json = data.slice("[CITATIONS]".length);
          try {
            const citations = JSON.parse(json);
            yield { type: "citations", citations };
          } catch {
            // ignore malformed citations
          }
          return;
        }
        yield { type: "content", text: data };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchDocument(documentId: string): Promise<Document> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}`, {
    headers: authHeaders(),
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!isDocument(payload)) {
    throw new ApiError(response.status, "malformed_response", "The server returned an unreadable document.");
  }
  return payload;
}

export async function fetchDocuments(limit = 50, offset = 0): Promise<Document[]> {
  const response = await fetch(`${API_BASE}/api/v1/documents?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(),
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!Array.isArray(payload)) {
    throw new ApiError(response.status, "malformed_response", "Expected an array of documents.");
  }
  return payload as Document[];
}

export async function fetchDocumentFile(documentId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}/file`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw toApiError(response.status, payload);
  }
  return await response.blob();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw toApiError(response.status, payload);
  }
}

export async function fetchManuscripts(): Promise<Manuscript[]> {
  const response = await fetch(`${API_BASE}/api/v1/manuscripts`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw toApiError(response.status, payload);
  }
  return (await response.json()) as Manuscript[];
}

export async function fetchManuscript(manuscriptId: string): Promise<Manuscript> {
  const response = await fetch(`${API_BASE}/api/v1/manuscripts/${manuscriptId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw toApiError(response.status, payload);
  }
  return (await response.json()) as Manuscript;
}

export async function createManuscript(payload: ManuscriptCreate): Promise<Manuscript> {
  const response = await fetch(`${API_BASE}/api/v1/manuscripts`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const payloadErr = await readJson(response);
    throw toApiError(response.status, payloadErr);
  }
  return (await response.json()) as Manuscript;
}

export async function updateManuscript(
  manuscriptId: string,
  payload: ManuscriptUpdate,
): Promise<Manuscript> {
  const response = await fetch(`${API_BASE}/api/v1/manuscripts/${manuscriptId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const payloadErr = await readJson(response);
    throw toApiError(response.status, payloadErr);
  }
  return (await response.json()) as Manuscript;
}

export async function deleteManuscript(manuscriptId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/manuscripts/${manuscriptId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw toApiError(response.status, payload);
  }
}

