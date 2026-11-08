# Sophia AI — Troubleshooting Guide

## 1. Authentication Issues

### "Missing or invalid Authorization header"
- **Cause**: User is not signed in or frontend request lacked the Bearer token.
- **Fix**: Check `useAuth().isAuthenticated`. Ensure `setAuthToken(session.access_token)` is called during login and that `VITE_SUPABASE_URL` matches `SUPABASE_URL`.

### "Access token has expired"
- **Cause**: The Supabase session expired.
- **Fix**: Supabase JS automatically refreshes tokens via `autoRefreshToken: true`. If offline or invalid, the user will be redirected to `/login`.

---

## 2. Storage & PDF Loading Issues

### "Document file not found (404)"
- **Cause**: PDF was not stored in Supabase Storage or local cache.
- **Fix**: Verify the `research-papers` bucket exists in your Supabase project and that storage RLS permits uploads:
  `bucket_id = 'research-papers' AND (storage.foldername(name))[1] = auth.uid()::text`.

---

## 3. AI and RAG Issues

### "Ollama connection refused"
- **Cause**: Ollama service is not running.
- **Fix**: Run `ollama serve` and pull the model: `ollama pull llama3.2`.
- Verify `OLLAMA_BASE_URL` in `backend/.env`.

### "The paper does not contain sufficient information"
- **Cause**: Expected when the question does not match any excerpt in the retrieved chunks above the similarity threshold.
- **Behavior**: This is intentional grounding behavior preventing hallucination.

