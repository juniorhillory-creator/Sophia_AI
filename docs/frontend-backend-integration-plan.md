# Sophia AI — Frontend/Backend Integration Plan

**Date:** November 2026  
**Auditor:** Antigravity AI  
**Principle:** 100% backend compatibility — every frontend user action strictly maps to an existing, verified FastAPI endpoint without inventing routes or payloads.

---

## 1. Page-to-Endpoint Integration Matrix

| Page / Feature | User Action | Backend Endpoint | HTTP Method | Request Payload | Response Schema | UI States Handled |
|---|---|---|---|---|---|---|
| **Auth / LoginPage** | Sign in with username/email & password | `/api/v1/auth/login` | `POST` | `LoginRequest`<br>`{ username_or_email, password }` | `AuthResponse`<br>`{ user, tokens }` | • Loading: button spinner<br>• Error: inline red alert (`401` bad creds, `403` disabled)<br>• Success: `setAuthToken`, redirect to `/dashboard` |
| **Auth / RegisterPage** | Create new account | `/api/v1/auth/register` | `POST` | `RegisterRequest`<br>`{ username, email, password, confirm_password }` | `AuthResponse`<br>`{ user, tokens }` | • Loading: button spinner<br>• Error: field errors (`409` user/email taken, `422` weak pwd)<br>• Success: auto-login & redirect to `/dashboard` |
| **Auth / TopNav** | Fetch current user info | `/api/v1/auth/me` | `GET` | Headers: `Authorization: Bearer <token>` | `UserResponse`<br>`{ id, username, email, full_name, avatar_url, ... }` | • Loading: skeleton badge<br>• Error: fallback to username from login token<br>• Success: display avatar letter and full name |
| **Auth / Token Refresh** | Automatic interceptor on 401 | `/api/v1/auth/refresh` | `POST` | `RefreshRequest`<br>`{ refresh_token }` | `TokenResponse`<br>`{ access_token, refresh_token, token_type }` | • Background: non-blocking token update<br>• Failure: log out user to `/login` with notification |
| **Auth / Logout** | User clicks Sign Out | `/api/v1/auth/logout` | `POST` | `LogoutRequest`<br>`{ access_token?: string }` | `204 No Content` | • Immediate local state reset and redirect to `/login` |
| **Dashboard / Metrics & Table** | Fetch user's papers list on mount | `/api/v1/documents` | `GET` | Headers: `Authorization: Bearer <token>`<br>Query: `limit=50&offset=0` | `list[Document]` | • Loading: table skeleton loader<br>• Empty: "No papers uploaded yet" with dropzone CTA<br>• Success: display paper cards/table with metadata<br>• Error: retry banner |
| **Dashboard & Workspace / Upload** | Drop or select PDF | `/api/v1/documents` | `POST` | Headers: `Authorization: Bearer <token>`<br>`multipart/form-data` with `file: Binary` | `Document`<br>`{ id, filename, page_count, chunk_count, status, ... }` | • Validating: client-side extension & size checks<br>• Uploading: upload progress bar (0-100%)<br>• Processing: "Indexing text and generating embeddings"<br>• Success: navigate to `/workspace/{id}`<br>• Error: inline alert with code from API |
| **My Papers / Delete Action** | Delete paper | `/api/v1/documents/{id}` | `DELETE` | Headers: `Authorization: Bearer <token>`<br>Path: `id: UUID` | `204 No Content` | • Loading: disabled button with spinner<br>• Success: remove row from table with animation<br>• Error: toast notification |
| **Workspace / PDF Reader** | Load PDF document in viewer | `/api/v1/documents/{id}/file` | `GET` | Headers: `Authorization: Bearer <token>`<br>Path: `id: UUID` | `application/pdf` Blob stream | • Loading: PDF canvas spinner<br>• Success: render page canvas via PDF.js<br>• Error: "Could not load original PDF file" |
| **Workspace / Summary Panel** | View cached summary | `/api/v1/documents/{id}/summary` | `GET` | Headers: `Authorization: Bearer <token>`<br>Path: `id: UUID` | `PaperSummary`<br>`{ title, authors, abstract, problem_statement, methodology, key_results, conclusion }` | • Loading: structured skeleton boxes<br>• Not Ready (`409`): auto-trigger POST generate<br>• Success: render section cards with copy buttons |
| **Workspace / Summary Panel** | Generate / regenerate summary | `/api/v1/documents/{id}/summary` | `POST` | Headers: `Authorization: Bearer <token>`<br>Path: `id: UUID` | `PaperSummary` | • Generating: "Writing structured summary (1-2 mins)" with pulse loader<br>• Success: display completed sections<br>• Error: model timeout / retry button |
| **Workspace / Research Chat** | Send question (live stream) | `/api/v1/documents/{id}/questions/stream?question={q}` | `GET` | Headers: `Authorization: Bearer <token>`, `Accept: text/event-stream` | Server-Sent Events stream (`data: token\n\n`, `data: [CITATIONS]{...}\n\n`) | • Pending: pulsing cursor<br>• Streaming: token-by-token text appending<br>• Citations: expandable sources list with page jump buttons<br>• Error: stream error message |
| **AI Writer / Paper Reference** | Load paper summary into writer sidebar | `/api/v1/documents/{id}/summary` | `GET` or `POST` | Headers: `Authorization: Bearer <token>`<br>Path: `id: UUID` | `PaperSummary` | • Ready: allows 1-click citation insertion into the manuscript editor |
| **AI Writer / Ask Paper** | Ask paper question while writing | `/api/v1/documents/{id}/questions` | `POST` | Headers: `Authorization: Bearer <token>`<br>`QuestionRequest` `{ question }` | `ChatResponse`<br>`{ answer, sources, document_id }` | • Success: provides grounded text excerpt and "Insert into draft" action button |

---

## 2. Error Handling & Normalization

All API responses with HTTP status >= 400 are parsed by `toApiError`:
```typescript
export interface ErrorBody {
  code: string;
  message: string;
}
```
Standardized error mapping:
- `network_error`: "Unable to connect to Sophia AI backend."
- `invalid_pdf`: "Please upload a valid PDF document with extractable text."
- `empty_document`: "The PDF contains no machine-readable text (scanned images require OCR)."
- `model_unavailable`: "The local Ollama inference service is offline or unreachable."
- `model_timeout`: "Model took too long to complete. Try asking a more specific question."
- `not_found`: "The requested document or resource was not found."

---

## 3. Supported vs. Unsupported AI Writer Capabilities

To maintain integrity and adhere to the project rules (**never fake functionality**), we clearly delineate what the AI Writer does:

| Capability | Backend Status | Implementation Strategy |
|---|---|---|
| **Manuscript Drafting Canvas** | Frontend | Standard rich text / markdown document editor with formatting toolbar (headings, bold, italics, lists, blockquotes, word count). |
| **Research Paper Integration** | **Supported** via `GET /documents` & `GET /documents/{id}/summary` | Writer displays an active "Paper Reference" pane where the user can view the paper's structured Abstract, Methodology, Findings, and copy/insert quotes. |
| **Grounded Research Querying** | **Supported** via `POST /documents/{id}/questions` | Writer allows running targeted queries against the paper to retrieve grounded passages and insert them as formatted citations `[1] (Page X)`. |
| **Draft Persistence** | Frontend (`localStorage` per user) | Drafts are stored in local browser state with auto-save timestamps. |
| **Export to Markdown/Text** | Frontend | Instant download of draft as `.md` or `.txt`. |
| *Full Autonomous Manuscript Generation* | **Unsupported** by backend | Do NOT pretend or fake full essay generation. The UI presents this as an **AI-Assisted Research Notebook & Synthesis Editor**. |

