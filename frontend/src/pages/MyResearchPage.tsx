import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import { DocumentList } from '../components/documents/DocumentList';
import { UploadCard } from '../components/upload/UploadCard';

export const MyResearchPage: React.FC = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setUploadDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            My Research Library
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Browse and manage all uploaded academic papers, summaries, and chat workspaces.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setUploadDialogOpen(true)}
          sx={{
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
          }}
        >
          Upload Paper
        </Button>
      </Box>

      {/* Main Document List */}
      <DocumentList
        key={refreshTrigger}
        onUploadClick={() => setUploadDialogOpen(true)}
      />

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Upload Research Paper
          </Typography>
          <IconButton size="small" onClick={() => setUploadDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <UploadCard onUploadSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
