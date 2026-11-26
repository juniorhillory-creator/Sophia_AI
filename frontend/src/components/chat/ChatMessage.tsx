import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  Stack,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { format } from 'date-fns';
import type { ChatMessage as ChatMessageType } from '../../types';
import { CitationPill } from './CitationPill';

interface ChatMessageProps {
  message: ChatMessageType;
  onNavigateToPage?: (page: number) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onNavigateToPage,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        mb: 2.5,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: isUser ? 'primary.main' : 'secondary.main',
          color: '#ffffff',
          boxShadow: isUser
            ? '0 2px 8px rgba(79, 70, 229, 0.3)'
            : '0 2px 8px rgba(124, 58, 237, 0.3)',
        }}
      >
        {isUser ? (
          <PersonOutlineIcon sx={{ fontSize: 20 }} />
        ) : (
          <SmartToyOutlinedIcon sx={{ fontSize: 20 }} />
        )}
      </Avatar>

      <Box sx={{ maxWidth: { xs: '85%', sm: '80%' }, minWidth: 120 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 0.5,
            flexDirection: isUser ? 'row-reverse' : 'row',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {isUser ? 'You' : 'Sophia AI'}
          </Typography>
          {formattedTime && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
              {formattedTime}
            </Typography>
          )}
          {!isUser && message.content && (
            <Tooltip title={copied ? 'Copied!' : 'Copy response'}>
              <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
                {copied ? (
                  <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            bgcolor: (theme) => {
              if (isUser) {
                return theme.palette.mode === 'dark'
                  ? 'rgba(99, 102, 241, 0.25)'
                  : 'rgba(79, 70, 229, 0.08)';
              }
              return theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff';
            },
            border: '1px solid',
            borderColor: (theme) => {
              if (isUser) {
                return theme.palette.mode === 'dark'
                  ? 'rgba(99, 102, 241, 0.4)'
                  : 'rgba(79, 70, 229, 0.2)';
              }
              return theme.palette.divider;
            },
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 2px 10px rgba(0, 0, 0, 0.2)'
                : '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {message.content}
            </Typography>
          ) : (
            <Box
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.65,
                color: 'text.primary',
                '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                '& ul, & ol': { pl: 2.5, my: 1 },
                '& li': { mb: 0.5 },
                '& code': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.06)',
                  px: 0.6,
                  py: 0.2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.85em',
                },
                '& pre': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(0, 0, 0, 0.5)'
                      : 'rgba(241, 245, 249, 1)',
                  p: 1.5,
                  borderRadius: 1.5,
                  overflowX: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  my: 1,
                },
                '& blockquote': {
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  ml: 0,
                  pl: 1.5,
                  color: 'text.secondary',
                  fontStyle: 'italic',
                },
                '& h1, & h2, & h3, & h4': {
                  mt: 1.5,
                  mb: 0.5,
                  fontWeight: 700,
                  color: 'text.primary',
                },
              }}
            >
              {message.content ? (
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {message.content}
                </ReactMarkdown>
              ) : message.isStreaming ? (
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                >
                  Thinking...
                </Typography>
              ) : null}

              {message.isStreaming && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 7,
                    height: 14,
                    ml: 0.5,
                    bgcolor: 'primary.main',
                    animation: 'blink 1s step-start infinite',
                    '@keyframes blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                />
              )}
            </Box>
          )}

          {/* Citations section if present */}
          {message.citations && message.citations.length > 0 && (
            <Box
              sx={{
                mt: 1.5,
                pt: 1.25,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: 'text.secondary',
                  mb: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Sources & Citations
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {message.citations.map((citation, index) => (
                  <CitationPill
                    key={`${citation.page}-${citation.chunk_id || index}`}
                    citation={citation}
                    onNavigateToPage={onNavigateToPage}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

