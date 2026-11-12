import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box, TextField, IconButton, Typography, Paper, Chip, Avatar,
  CircularProgress, Alert, Divider, Tooltip,
} from "@mui/material";
import {
  SendRounded, AutoAwesomeRounded, PersonRounded, ContentCopyRounded, CheckRounded,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { askQuestionStream, errorMessage } from "../api/client";
import type { SourceCitation } from "../api/types";

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: SourceCitation[];
  streaming?: boolean;
}

const SUGGESTED = [
  "What is the main contribution of this paper?",
  "What methodology did the authors use?",
  "What are the key findings and results?",
  "What are the limitations of this work?",
  "How does this compare to prior work?",
];

function CitationChips({ citations }: { citations: SourceCitation[] }) {
  return (
    <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
      {citations.map((c) => (
        <Chip
          key={c.chunk_id}
          label={`Page ${c.page}`}
          size="small"
          variant="outlined"
          color="primary"
          title={c.excerpt}
        />
      ))}
    </Box>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title="Copy">
      <IconButton size="small" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
        {copied ? <CheckRounded sx={{ fontSize: 14 }} color="success" /> : <ContentCopyRounded sx={{ fontSize: 14 }} />}
      </IconButton>
    </Tooltip>
  );
}

export function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (question: string) => {
    if (!question.trim() || busy) return;
    setError("");
    setBusy(true);

    const userMsg: Message = { role: "user", text: question };
    const asstMsg: Message = { role: "assistant", text: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, asstMsg]);

    abortRef.current = new AbortController();
    let accumulated = "";
    let lastCitations: SourceCitation[] = [];

    try {
      for await (const chunk of askQuestionStream(documentId, question, abortRef.current.signal)) {
        if (chunk.type === "content") {
          accumulated += chunk.text;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], text: accumulated };
            return next;
          });
        } else if (chunk.type === "citations") {
          lastCitations = chunk.citations;
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError(errorMessage(err));
      }
    } finally {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: accumulated || "No answer returned.", citations: lastCitations, streaming: false };
        return next;
      });
      setBusy(false);
    }
  }, [documentId, busy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
    setInput("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 500 }}>
      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <AutoAwesomeRounded sx={{ fontSize: 40, color: "primary.main", mb: 1.5 }} />
            <Typography variant="h6" fontWeight={600} mb={0.5}>Ask about this paper</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              I can answer questions using evidence from the document.
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
              {SUGGESTED.map((q) => (
                <Chip key={q} label={q} onClick={() => send(q)} clickable size="small" sx={{ maxWidth: 260 }} />
              ))}
            </Box>
          </Box>
        )}

        {messages.map((msg, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
            <Avatar sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: msg.role === "user" ? "primary.main" : "secondary.main", fontSize: 14 }}>
              {msg.role === "user" ? <PersonRounded sx={{ fontSize: 18 }} /> : <AutoAwesomeRounded sx={{ fontSize: 18 }} />}
            </Avatar>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5, maxWidth: "80%", borderRadius: 3,
                bgcolor: msg.role === "user" ? "primary.main" : "background.paper",
                color: msg.role === "user" ? "white" : "text.primary",
                borderColor: msg.role === "user" ? "transparent" : "divider",
              }}
            >
              {msg.role === "assistant" ? (
                <Box sx={{ "& p": { m: 0 }, "& p + p": { mt: 1 }, fontSize: 14, lineHeight: 1.75 }}>
                  <ReactMarkdown>{msg.text || (msg.streaming ? "▋" : "")}</ReactMarkdown>
                  {msg.citations && msg.citations.length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Sources</Typography>
                      <CitationChips citations={msg.citations} />
                    </>
                  )}
                  {!msg.streaming && msg.text && (
                    <Box mt={0.5}><CopyButton text={msg.text} /></Box>
                  )}
                </Box>
              ) : (
                <Typography variant="body2">{msg.text}</Typography>
              )}
              {msg.streaming && (
                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                  <CircularProgress size={12} color="inherit" />
                  <Typography variant="caption" color="text.secondary">Thinking…</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        ))}
        <div ref={bottomRef} />
      </Box>

      {error && <Alert severity="error" sx={{ mx: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Input */}
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask a question about the paper…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            multiline
            maxRows={4}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
          <IconButton type="submit" color="primary" disabled={!input.trim() || busy} sx={{ bgcolor: "primary.main", color: "white", borderRadius: 2, "&:hover": { bgcolor: "primary.dark" }, "&:disabled": { bgcolor: "action.disabledBackground" } }}>
            {busy ? <CircularProgress size={18} color="inherit" /> : <SendRounded />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

