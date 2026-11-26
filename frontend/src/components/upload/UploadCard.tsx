import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdfRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import IconButton from "@mui/material/IconButton";
import { alpha, useTheme } from "@mui/material/styles";
import { documentApi } from "../../api/documentApi";
import type { Document } from "../../types";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface UploadCardProps {
  onUploadSuccess: (document: Document) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onUploadSuccess }) => {
  const theme = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: unknown[]) => {
    setErrorMessage(null);
    if (fileRejections && (fileRejections as Array<unknown>).length > 0) {
      setErrorMessage("Please select a valid PDF file under 20MB.");
      return;
    }
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMessage("Only PDF documents are supported.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage("File exceeds the 20MB size limit.");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading,
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadProgress(0);
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const doc = await documentApi.uploadDocument(selectedFile, (percent) => {
        setUploadProgress(percent);
      });
      setSelectedFile(null);
      onUploadSuccess(doc);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail ||
            "Failed to upload document. Please verify the backend is running.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card sx={{ border: 1, borderColor: "divider", mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Upload Research Paper
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
          Upload an academic paper in PDF format (up to 20MB) to generate structured summaries and ask AI questions.
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {!selectedFile ? (
          <Box
            {...getRootProps()}
            sx={{
              p: 4,
              border: "2px dashed",
              borderColor: isDragActive ? "primary.main" : "divider",
              borderRadius: 3,
              bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : "background.default",
              textAlign: "center",
              cursor: isUploading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.03),
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon
              sx={{
                fontSize: 48,
                color: isDragActive ? "primary.main" : "text.secondary",
                mb: 1.5,
              }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {isDragActive ? "Drop the PDF here..." : "Drag and drop your paper here"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Supports digital and scanned PDF research papers
            </Typography>
            <Button variant="outlined" size="small" component="span" disabled={isUploading}>
              Browse Files
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <PictureAsPdfIcon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {formatSize(selectedFile.size)}
                  </Typography>
                </Box>
              </Box>
              {!isUploading && (
                <IconButton size="small" onClick={handleClear} aria-label="remove file">
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {isUploading && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    {uploadProgress < 100 ? "Uploading paper..." : "Processing & Indexing..."}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
                    {uploadProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant={uploadProgress < 100 ? "determinate" : "indeterminate"}
                  value={uploadProgress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button variant="outlined" size="small" onClick={handleClear} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleUpload}
                disabled={isUploading}
                startIcon={<CloudUploadIcon />}
              >
                {isUploading ? "Uploading..." : "Process Paper"}
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

