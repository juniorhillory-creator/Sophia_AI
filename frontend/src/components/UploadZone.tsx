import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Card, CardContent, Typography, LinearProgress,
  Alert, IconButton, Chip,
} from "@mui/material";
import {
  CloudUploadRounded, PictureAsPdfRounded, CloseRounded, CheckCircleRounded,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import { uploadDocument, createSummary, rejectUpload, errorMessage, MAX_UPLOAD_BYTES } from "../api/client";

interface Props { onUploaded?: () => void; }

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export function UploadZone({ onUploaded }: Props) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted[0]) return;
    const err = rejectUpload(accepted[0]);
    if (err) { setErrorMsg(err); return; }
    setFile(accepted[0]);
    setErrorMsg("");
    setPhase("idle");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    maxSize: MAX_UPLOAD_BYTES,
    onDropRejected: (r) => setErrorMsg(r[0]?.errors[0]?.message || "Invalid file."),
  });

  const handleUpload = async () => {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);
    setErrorMsg("");
    try {
      const doc = await uploadDocument(file, (loaded, total) => setProgress(Math.round((loaded / total) * 100)));
      setPhase("processing");
      await createSummary(doc.id);
      setPhase("done");
      onUploaded?.();
      setTimeout(() => navigate(`/documents/${doc.id}`), 800);
    } catch (err) {
      setPhase("error");
      setErrorMsg(errorMessage(err));
    }
  };

  const reset = () => { setFile(null); setPhase("idle"); setErrorMsg(""); setProgress(0); };

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Upload Research Paper</Typography>

        {!file ? (
          <Box
            {...getRootProps()}
            sx={{
              border: "2px dashed",
              borderColor: isDragActive ? "primary.main" : "divider",
              borderRadius: 3, p: 5, textAlign: "center", cursor: "pointer",
              bgcolor: isDragActive ? "primary.main" + "08" : "background.default",
              transition: "all .2s",
              "&:hover": { borderColor: "primary.main", bgcolor: "primary.main" + "06" },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadRounded sx={{ fontSize: 48, color: "primary.main", mb: 1.5 }} />
            <Typography variant="body1" fontWeight={500} mb={0.5}>
              {isDragActive ? "Drop your PDF here" : "Drag & drop your PDF here"}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              or click to browse — PDF only, up to 20 MB
            </Typography>
            <Button variant="outlined" size="small">Browse Files</Button>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider", mb: 2 }}>
              <PictureAsPdfRounded color="error" />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500} noWrap>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Typography>
              </Box>
              {phase === "idle" && (
                <IconButton size="small" onClick={reset}><CloseRounded fontSize="small" /></IconButton>
              )}
              {phase === "done" && <CheckCircleRounded color="success" />}
            </Box>

            {(phase === "uploading" || phase === "processing") && (
              <Box mb={2}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {phase === "uploading" ? `Uploading… ${progress}%` : "Generating AI summary…"}
                  </Typography>
                  {phase === "uploading" && <Typography variant="caption" color="text.secondary">{progress}%</Typography>}
                </Box>
                <LinearProgress variant={phase === "uploading" ? "determinate" : "indeterminate"} value={progress} />
                {phase === "processing" && (
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    {["Extracted text", "Indexed chunks", "Generating summary"].map((s, i) => (
                      <Chip key={s} label={s} size="small" color={i < 2 ? "success" : "default"} variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {phase === "done" && (
              <Alert severity="success" sx={{ mb: 2 }}>Paper processed — opening workspace…</Alert>
            )}

            {errorMsg && <Alert severity="error" sx={{ mb: 2 }} onClose={reset}>{errorMsg}</Alert>}

            {phase === "idle" && (
              <Box display="flex" gap={1}>
                <Button variant="contained" onClick={handleUpload} fullWidth>Upload & Analyze</Button>
                <Button variant="outlined" onClick={reset}>Clear</Button>
              </Box>
            )}
            {phase === "error" && (
              <Box display="flex" gap={1}>
                <Button variant="contained" onClick={handleUpload} fullWidth>Retry</Button>
                <Button variant="outlined" onClick={reset}>Clear</Button>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

