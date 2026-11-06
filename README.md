# Sophia_AI

## Paper summary

`POST /api/v1/documents/{document_id}/summary` reads the stored paper and returns `PaperSummary`. The default model is local Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`). No paid API is called.

```json
{
  "title": "string",
  "authors": "string",
  "abstract": "string",
  "problem_statement": "string",
  "methodology": "string",
  "key_results": "string",
  "conclusion": "string"
}
```

A field the paper does not support is exactly `Not found in the paper.`

| Status | Code | When |
| --- | --- | --- |
| 404 | `not_found` | Unknown document |
| 502 | `malformed_model_response` | Unreadable model payload, or JSON that still fails the schema after one repair |
| 503 | `model_unavailable` | Ollama cannot be reached, or the model request fails |
| 504 | `model_timeout` | The model call exceeds `OLLAMA_TIMEOUT_SECONDS` |