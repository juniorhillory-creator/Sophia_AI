import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Button,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { fetchPdfBlob } from '../../api/documentApi';

interface PdfViewerProps {
  documentId: string;
  filename?: string;
  initialPage?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  documentId,
  filename = 'document.pdf',
  initialPage = 1,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  const loadPdf = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await fetchPdfBlob(documentId);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load PDF document.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdf();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [documentId]);

  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      {/* Viewer Toolbar */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
          <PictureAsPdfIcon sx={{ color: 'error.main', fontSize: 20 }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {filename}
          </Typography>
          {currentPage > 1 && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: 'primary.main',
                color: '#ffffff',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontWeight: 700,
              }}
            >
              Page {currentPage}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Reload PDF">
            <IconButton size="small" onClick={loadPdf} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new window">
            <span>
              <IconButton
                size="small"
                onClick={handleOpenExternal}
                disabled={!blobUrl || loading}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download PDF">
            <span>
              <IconButton
                size="small"
                onClick={handleDownload}
                disabled={!blobUrl || loading}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? '#0f172a' : '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <CircularProgress size={36} sx={{ color: 'primary.main', mb: 2 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Retrieving paper from Sophia AI storage...
            </Typography>
          </Box>
        )}

        {error && !loading && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              maxWidth: 400,
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'error.main',
              borderRadius: 2,
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Failed to display PDF
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadPdf}
            >
              Try Again
            </Button>
          </Paper>
        )}

        {blobUrl && !loading && !error && (
          <iframe
            src={`${blobUrl}#page=${currentPage}&toolbar=1&navpanes=0`}
            title={filename}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        )}
      </Box>
    </Box>
  );
};

