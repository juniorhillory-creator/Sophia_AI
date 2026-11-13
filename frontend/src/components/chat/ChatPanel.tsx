import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Stack,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type { ChatMessage as ChatMessageType, SourceCitation } from '../../types';
import { ChatMessage } from './ChatMessage';
import { streamQuestion } from '../../api/chatApi';

interface ChatPanelProps {
  documentId: string;
  documentTitle?: string;
  onNavigateToPage?: (page: number) => void;
}

const SUGGESTED_PROMPTS = [
  'What is the core methodology of this paper?',
  'What are the key results and performance metrics?',
  'What dataset or benchmark was evaluated?',
  'What are the main limitations identified by authors?',
  'How does this work compare to prior approaches?',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  documentId,
  documentTitle,
  onNavigateToPage,
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I have indexed **${
        documentTitle || 'this research paper'
      }**. You can ask me any question about the methodology, findings, proofs, datasets, or conclusions, and I will cite the exact page numbers from the paper.`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isStreaming) return;

    setError(null);
    setInput('');

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedContent = '';
    let accumulatedCitations: SourceCitation[] = [];

    try {
      await streamQuestion(documentId, textToSend, {
        signal: abortController.signal,
        onChunk: (chunk: string) => {
          accumulatedContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        },
        onCitations: (citations: SourceCitation[]) => {
          accumulatedCitations = citations;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, citations: accumulatedCitations }
                : msg
            )
          );
        },
        onError: (err: Error) => {
          if (err.name === 'AbortError') return;
          setError(err.message || 'Failed to stream answer from Sophia AI.');
        },
        onDone: () => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
            )
          );
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stream aborted cleanly
      } else {
        const errorMsg =
          err instanceof Error ? err.message : 'An error occurred during chat.';
        setError(errorMsg);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleClearChat = () => {
    handleStopStreaming();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. What else would you like to explore in **${
          documentTitle || 'this paper'
        }**?`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(248, 250, 252, 0.8)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Ask Sophia AI
          </Typography>
          <Chip
            size="small"
            label="RAG Citations"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 700,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(16, 185, 129, 0.1)',
              color: 'success.main',
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(16, 185, 129, 0.2)',
            }}
          />
        </Box>

        <Tooltip title="Clear chat history">
          <IconButton size="small" onClick={handleClearChat}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages Scroll Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onNavigateToPage={onNavigateToPage}
          />
        ))}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {error}
          </Alert>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Prompts (visible when few messages) */}
      {messages.length <= 3 && !isStreaming && (
        <Box
          sx={{
            px: 2.5,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.01)'
                : 'rgba(248, 250, 252, 0.5)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 13, color: 'primary.main' }} />
            Suggested Questions:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <Chip
                key={prompt}
                label={prompt}
                size="small"
                onClick={() => handleSend(prompt)}
                sx={{
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'rgba(79, 70, 229, 0.08)',
                    borderColor: 'primary.main',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Input Form */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            p: 1,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: (theme) =>
              isStreaming
                ? 'secondary.main'
                : theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(0, 0, 0, 0.12)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 2px 8px rgba(0,0,0,0.3)'
                : '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'border-color 0.2s ease',
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={
              isStreaming
                ? 'Sophia AI is generating response...'
                : 'Ask a question about this research paper... (Press Enter to send)'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '0.875rem',
                px: 1,
                py: 0.5,
              },
            }}
          />

          {isStreaming ? (
            <Tooltip title="Stop generation">
              <IconButton
                color="error"
                onClick={handleStopStreaming}
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(239, 68, 68, 0.1)',
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(239, 68, 68, 0.25)'
                        : 'rgba(239, 68, 68, 0.2)',
                  },
                }}
              >
                <StopCircleOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Send question">
              <span>
                <IconButton
                  color="primary"
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  sx={{
                    bgcolor: input.trim() ? 'primary.main' : 'transparent',
                    color: input.trim() ? '#ffffff !important' : 'inherit',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '&.Mui-disabled': {
                      color: 'text.disabled',
                    },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Paper>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: 'text.disabled',
            mt: 0.75,
            fontSize: '0.7rem',
          }}
        >
          Responses are grounded in retrieved excerpts from this document with exact page citations.
        </Typography>
      </Box>
    </Box>
  );
};
