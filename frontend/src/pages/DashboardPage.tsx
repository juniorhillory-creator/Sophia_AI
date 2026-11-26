import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Paper,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDocuments } from '../api/documentApi';
import { useAuth } from '../context/AuthContext';
import { UploadCard } from '../components/upload/UploadCard';
import { DocumentCard } from '../components/documents/DocumentCard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import type { Document } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);

  const {
    data: documents = [] as Document[],
    isLoading,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => fetchDocuments(),
  });

  const processedCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter((d) => d.status === 'processing').length;
  const recentDocuments = documents.slice(0, 4);

  const stats = [
    {
      title: 'Total Research Papers',
      value: documents.length,
      icon: <MenuBookIcon sx={{ color: 'primary.main', fontSize: 24 }} />,
      color: 'rgba(79, 70, 229, 0.1)',
    },
    {
      title: 'AI Synthesized Papers',
      value: processedCount,
      icon: <AutoAwesomeIcon sx={{ color: 'secondary.main', fontSize: 24 }} />,
      color: 'rgba(124, 58, 237, 0.1)',
    },
    {
      title: 'Papers in Queue',
      value: processingCount,
      icon: <StorageIcon sx={{ color: 'warning.main', fontSize: 24 }} />,
      color: 'rgba(245, 158, 11, 0.1)',
    },
    {
      title: 'RAG Citation Index',
      value: 'Gemini 2.5',
      icon: <QuestionAnswerIcon sx={{ color: 'success.main', fontSize: 24 }} />,
      color: 'rgba(16, 185, 129, 0.1)',
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Hero Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(124, 58, 237, 0.25) 100%)'
              : 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(99, 102, 241, 0.3)'
              : 'rgba(79, 70, 229, 0.15)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Box sx={{ maxWidth: 650 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'secondary.main',
              }}
            >
              Academic AI Research Assistant
            </Typography>
          </Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}
          >
            Welcome back, {user?.username || 'Researcher'}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', lineHeight: 1.6 }}
          >
            Upload academic publications to instantly extract structured 5-part
            summaries and engage in citation-backed conversational RAG.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUploadIcon />}
            onClick={() => setShowUpload((prev) => !prev)}
            sx={{
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
            }}
          >
            {showUpload ? 'Hide Uploader' : 'Upload Research Paper'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/documents')}
            sx={{ fontWeight: 600 }}
          >
            View Library
          </Button>
        </Stack>
      </Paper>

      {/* Upload Drawer / Card */}
      {(showUpload || documents.length === 0) && (
        <Box sx={{ mb: 4 }}>
          <UploadCard
            onUploadSuccess={() => {
              refetch();
              setShowUpload(false);
            }}
          />
        </Box>
      )}

      {/* Metrics Row */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {stats.map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {stat.title}
                  </Typography>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Research Section */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2.5,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Research Papers
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Jump straight into your indexed papers or review summaries
            </Typography>
          </Box>
          {documents.length > 0 && (
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/documents')}
              sx={{ fontWeight: 600 }}
            >
              View All ({documents.length})
            </Button>
          )}
        </Box>

        {isLoading ? (
          <LoadingSkeleton type="card" count={3} />
        ) : recentDocuments.length > 0 ? (
          <Grid container spacing={2.5}>
            {recentDocuments.map((doc) => (
              <Grid item xs={12} sm={6} md={3} key={doc.id}>
                <DocumentCard document={doc} onDeleted={refetch} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <MenuBookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No research papers indexed yet
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', maxWidth: 450, mx: 'auto', mb: 3 }}
            >
              Upload an academic paper in PDF format (up to 20MB) to start generating
              structured summaries and asking questions with citations.
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setShowUpload(true)}
              sx={{ fontWeight: 600 }}
            >
              Upload First Paper
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
};
