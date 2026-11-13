import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDocumentById, deleteDocument } from '../api/documentApi';
import { StatusBadge } from '../components/common/StatusBadge';
import { PdfViewer } from '../components/workspace/PdfViewer';
import { SummaryPanel } from '../components/summary/SummaryPanel';
import { ChatPanel } from '../components/chat/ChatPanel';

export const ResearchWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Mobile active tab: 0 = PDF, 1 = Summary, 2 = Chat
  // Desktop active tab for right panel: 0 = Summary, 1 = Chat
  const [mobileTab, setMobileTab] = useState(1);
  const [rightPanelTab, setRightPanelTab] = useState(0);
  const [targetPage, setTargetPage] = useState<number>(1);

  const {
    data: document,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocumentById(id!),
    enabled: Boolean(id),
  });

  const handleCitationClick = (page: number) => {
    setTargetPage(page);
    if (isMobile) {
      setMobileTab(0); // Switch to PDF tab on mobile to see the citation
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this research document?')) {
      return;
    }
    try {
      await deleteDocument(id);
      navigate('/documents');
    } catch {
      alert('Failed to delete document');
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 120px)',
        }}
      >
        <CircularProgress size={44} sx={{ color: 'primary.main', mb: 2 }} />
        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Loading research workspace...
        </Typography>
      </Box>
    );
  }

  if (error || !document) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
          Document Not Found
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          The requested paper may have been deleted or you do not have permission to access it.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/documents')}
        >
          Return to Library
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* Workspace Header & Breadcrumbs */}
      <Paper
        elevation={0}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
          <Tooltip title="Back to Library">
            <IconButton
              size="small"
              onClick={() => navigate('/documents')}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ overflow: 'hidden' }}>
            <Breadcrumbs
              aria-label="breadcrumb"
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                mb: 0.25,
                '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' },
              }}
            >
              <MuiLink
                component={RouterLink}
                to="/documents"
                underline="hover"
                color="inherit"
              >
                Research Library
              </MuiLink>
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Workspace
              </Typography>
            </Breadcrumbs>

            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: 200, sm: 400, md: 600 },
                lineHeight: 1.2,
              }}
            >
              {document.title || document.filename}
            </Typography>
          </Box>
        </Box>

        {/* Action badges and controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusBadge status={document.status} />

          <Tooltip title="Refresh paper status">
            <IconButton size="small" onClick={() => refetch()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete paper">
            <IconButton size="small" color="error" onClick={handleDelete}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Main Workspace Body */}
      {isMobile ? (
        // Mobile Layout: Tabs for [PDF Viewer, Summary, Chat]
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <Tabs
            value={mobileTab}
            onChange={(_, val) => setMobileTab(val)}
            variant="fullWidth"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              minHeight: 44,
              bgcolor: 'background.paper',
            }}
          >
            <Tab
              icon={<PictureAsPdfIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Original PDF"
              sx={{ minHeight: 44, py: 0, textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="AI Summary"
              sx={{ minHeight: 44, py: 0, textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              icon={<QuestionAnswerIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Ask AI"
              sx={{ minHeight: 44, py: 0, textTransform: 'none', fontWeight: 700 }}
            />
          </Tabs>

          <Box sx={{ flex: 1, p: 1.5, overflow: 'hidden' }}>
            {mobileTab === 0 && (
              <PdfViewer
                documentId={document.id}
                filename={document.filename}
                initialPage={targetPage}
              />
            )}
            {mobileTab === 1 && (
              <SummaryPanel
                documentId={document.id}
                documentTitle={document.title || document.filename}
              />
            )}
            {mobileTab === 2 && (
              <ChatPanel
                documentId={document.id}
                documentTitle={document.title || document.filename}
                onNavigateToPage={handleCitationClick}
              />
            )}
          </Box>
        </Box>
      ) : (
        // Desktop Layout: Side-by-Side Split View
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            p: 2,
            gap: 2,
            overflow: 'hidden',
          }}
        >
          {/* Left Panel: Original PDF Viewer */}
          <Box sx={{ flex: '1 1 50%', height: '100%', minWidth: 0 }}>
            <PdfViewer
              documentId={document.id}
              filename={document.filename}
              initialPage={targetPage}
            />
          </Box>

          {/* Right Panel: AI Capabilities (Tabs: Summary / Chat) */}
          <Box
            sx={{
              flex: '1 1 50%',
              height: '100%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                mb: 1.5,
                p: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Tabs
                value={rightPanelTab}
                onChange={(_, val) => setRightPanelTab(val)}
                sx={{
                  minHeight: 40,
                  '& .MuiTab-root': {
                    minHeight: 40,
                    py: 0.5,
                    px: 2.5,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  },
                }}
              >
                <Tab
                  icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label="Structured Summary"
                />
                <Tab
                  icon={<QuestionAnswerIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label="Conversational RAG Chat"
                />
              </Tabs>
            </Paper>

            <Box sx={{ flex: 1, minHeight: 0 }}>
              {rightPanelTab === 0 ? (
                <SummaryPanel
                  documentId={document.id}
                  documentTitle={document.title || document.filename}
                />
              ) : (
                <ChatPanel
                  documentId={document.id}
                  documentTitle={document.title || document.filename}
                  onNavigateToPage={handleCitationClick}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
