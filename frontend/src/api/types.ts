/** JSON shapes from backend Pydantic models. Datetimes and UUIDs arrive as strings. */

export interface ErrorBody {
  code: string;
  message: string;
}

export interface HealthResponse {
  status: "ok";
}

export interface Document {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  created_at: string;
}

export interface Chunk {
  chunk_id: string;
  document_id: string;
  page_number: number;
  index_on_page: number;
  text: string;
}

export interface ChunkList {
  document_id: string;
  chunks: Chunk[];
}

export interface QuestionRequest {
  question: string;
}

export interface SourceCitation {
  page: number;
  excerpt: string;
  chunk_id: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  document_id: string;
}

export interface PaperSummary {
  title: string;
  authors: string;
  abstract: string;
  problem_statement: string;
  methodology: string;
  key_results: string;
  conclusion: string;
}

export const NOT_FOUND = "Not found in the paper.";

export const INSUFFICIENT = "The paper does not contain sufficient information.";

export const SUMMARY_SECTIONS = [
  { key: "abstract", label: "Abstract" },
  { key: "problem_statement", label: "Problem statement" },
  { key: "methodology", label: "Methodology" },
  { key: "key_results", label: "Key results" },
  { key: "conclusion", label: "Conclusion" },
] as const satisfies readonly { key: keyof PaperSummary; label: string }[];
