import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardActionArea, Typography, Box, Chip,
  IconButton, Menu, MenuItem, ListItemIcon, Tooltip,
} from "@mui/material";
import {
  PictureAsPdfRounded, MoreVertRounded, OpenInNewRounded,
  DeleteRounded, CheckCircleRounded, ErrorRounded, HourglassEmptyRounded,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import type { Document } from "../api/types";

interface Props {
  document: Document;
  onDelete?: (id: string) => void;
}

function StatusChip({ status }: { status: string }) {
  if (status === "ready") return <Chip icon={<CheckCircleRounded />} label="Ready" color="success" size="small" variant="outlined" />;
  if (status === "failed") return <Chip icon={<ErrorRounded />} label="Failed" color="error" size="small" variant="outlined" />;
  return <Chip icon={<HourglassEmptyRounded />} label="Processing" color="warning" size="small" variant="outlined" />;
}

export function DocumentCard({ document, onDelete }: Props) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const handleOpen = () => navigate(`/documents/${document.id}`);

  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardActionArea onClick={handleOpen} sx={{ flexGrow: 1 }}>
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={1.5} mb={1.5}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: "error.main" + "12", flexShrink: 0 }}>
              <PictureAsPdfRounded sx={{ color: "error.main", fontSize: 24 }} />
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap title={document.filename}>
                {document.filename.replace(/\.pdf$/i, "")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {document.page_count} pages · {document.chunk_count} chunks
              </Typography>
            </Box>
            <Tooltip title="More options">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
              >
                <MoreVertRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <StatusChip status={(document as any).status ?? "ready"} />
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); handleOpen(); }}>
          <ListItemIcon><OpenInNewRounded fontSize="small" /></ListItemIcon>Open
        </MenuItem>
        {onDelete && (
          <MenuItem onClick={() => { setAnchor(null); onDelete(document.id); }} sx={{ color: "error.main" }}>
            <ListItemIcon><DeleteRounded fontSize="small" color="error" /></ListItemIcon>Delete
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}

