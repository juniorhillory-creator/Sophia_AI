import React, { useState } from "react";
import {
  Box, Typography, IconButton, Collapse, Paper, Tooltip,
} from "@mui/material";
import {
  ExpandMoreRounded, ExpandLessRounded, ContentCopyRounded, CheckRounded,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";

interface Props {
  icon: React.ReactNode;
  label: string;
  content: string;
  defaultExpanded?: boolean;
  color?: string;
}

export function SummarySection({ icon, label, content, defaultExpanded = true, color = "primary.main" }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", mb: 2 }}>
      <Box
        sx={{
          display: "flex", alignItems: "center", px: 2.5, py: 1.5, cursor: "pointer",
          bgcolor: "background.default", borderBottom: expanded ? "1px solid" : "none", borderColor: "divider",
          "&:hover": { bgcolor: color + "08" },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ color, mr: 1.5, display: "flex", alignItems: "center" }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ flexGrow: 1 }}>{label}</Typography>
        <Tooltip title="Copy">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); copy(); }}
            sx={{ mr: 0.5 }}
          >
            {copied ? <CheckRounded fontSize="small" color="success" /> : <ContentCopyRounded fontSize="small" />}
          </IconButton>
        </Tooltip>
        <IconButton size="small">
          {expanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2.5, py: 2, "& p": { m: 0, lineHeight: 1.75 }, "& p + p": { mt: 1 } }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </Box>
      </Collapse>
    </Paper>
  );
}

