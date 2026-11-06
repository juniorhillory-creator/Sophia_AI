import type {
  ChatResponse,
  Document,
  ErrorBody,
  PaperSummary,
  SourceCitation,
} from "./types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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
  return error instanceof ApiError ? error.message : "Something went wrong.";
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
    xhr.open("POST", "/api/v1/documents");
    xhr.responseType = "text";
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
  const response = await fetch(`/api/v1/documents/${documentId}/summary`, { method: "POST", signal });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!isPaperSummary(payload)) {
    throw new ApiError(response.status, "malformed_response", "The server returned an unreadable summary.");
  }
  return payload;
}

// shortcut: the API takes one question, so earlier bubbles stay on screen only
export async function askQuestion(documentId: string, question: string): Promise<ChatResponse> {
  const response = await fetch(`/api/v1/documents/${documentId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question } satisfies { question: string }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (!isChatResponse(payload)) {
    throw new ApiError(response.status, "malformed_response", "The server returned an unreadable answer.");
  }
  return payload;
}
