import React from 'react';
import { Chip, Tooltip, Box, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import type { SourceCitation } from '../../types';

interface CitationPillProps {
  citation: SourceCitation;
  onNavigateToPage?: (page: number) => void;
}

export const CitationPill: React.FC<CitationPillProps> = ({
  citation,
  onNavigateToPage,
}) => {
  const handleClick = () => {
    if (citation.page && onNavigateToPage) {
      onNavigateToPage(citation.page);
    }
  };

  const tooltipContent = (
    <Box sx={{ p: 0.5, maxWidth: 300 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
        Page {citation.page}
      </Typography>
      {citation.excerpt && (
        <Typography
          variant="caption"
          sx={{
            fontStyle: 'italic',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          "{citation.excerpt}"
        </Typography>
      )}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        icon={<MenuBookIcon sx={{ fontSize: '0.9rem !important' }} />}
        label={`p. ${citation.page}`}
        size="small"
        clickable={Boolean(citation.page && onNavigateToPage)}
        onClick={handleClick}
        sx={{
          borderRadius: 1.5,
          fontWeight: 600,
          fontSize: '0.75rem',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(99, 102, 241, 0.15)'
              : 'rgba(79, 70, 229, 0.08)',
          color: 'primary.main',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(99, 102, 241, 0.3)'
              : 'rgba(79, 70, 229, 0.2)',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(99, 102, 241, 0.3)'
                : 'rgba(79, 70, 229, 0.18)',
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.15)',
          },
        }}
      />
    </Tooltip>
  );
};

