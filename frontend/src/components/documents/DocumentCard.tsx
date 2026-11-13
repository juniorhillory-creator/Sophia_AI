import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdfRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import LayersIcon from "@mui/icons-material/LayersRounded";
import MenuBookIcon from "@mui/icons-material/MenuBookRounded";
import { format } from "date-fns";
import { alpha, useTheme } from "@mui/material/styles";
import { StatusBadge } from "../common/StatusBadge";
import { deleteDocument } from "../../api/documentApi";
import type { Document } from "../../types";

export interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => Promise<void> | void;
  onDeleted?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDelete,
  onDeleted,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = React.useMemo(() => {
    try {
      return format(new Date(document.created_at), "MMM d, yyyy");
    } catch {
      return "Recently";
    }
  }, [document.created_at]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(document.id);
      } else {
        await deleteDocument(document.id);
      }
      onDeleted?.();
      setConfirmOpen(false);
    } catch (err) {
      console.error("Failed to delete document:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
            transform: "translateY(-2px)",
          },
        }}
      >
        <CardContent sx={{ p: 2.5, flexGrow: 1, display: "flex", flexDirection: "column" }}>
          {/* Top Status & Icon */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PictureAsPdfIcon fontSize="small" />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <StatusBadge status={document.status} stage={document.stage} />
              {onDelete && (
                <Tooltip title="Delete document">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmOpen(true);
                    }}
                    sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1rem",
              lineHeight: 1.35,
              mb: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={document.filename}
          >
            {document.filename.replace(/\.pdf$/i, "")}
          </Typography>

          {/* Metrics Metadata */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, color: "text.secondary", mb: 2, mt: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MenuBookIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {document.page_count} {document.page_count === 1 ? "page" : "pages"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <LayersIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {document.chunk_count} chunks
              </Typography>
            </Box>
          </Box>

          {/* Footer Actions */}
          <Box
            sx={{
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {formattedDate}
            </Typography>
            <Button
              size="small"
              variant="text"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(`/documents/${document.id}`)}
              sx={{ fontWeight: 600, px: 1 }}
            >
              Workspace
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Research Document?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{document.filename}</strong>? All associated text chunks, vector
            indices, and generated summaries will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
