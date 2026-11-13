import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Collapse from "@mui/material/Collapse";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import MenuBookIcon from "@mui/icons-material/MenuBookRounded";
import ReportProblemIcon from "@mui/icons-material/ReportProblemRounded";
import ScienceIcon from "@mui/icons-material/ScienceRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadIcon from "@mui/icons-material/DownloadRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { alpha, useTheme } from "@mui/material/styles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SummarySkeleton } from "../common/LoadingSkeleton";
import { summaryApi } from "../../api/summaryApi";
import type { PaperSummary } from "../../types";

export interface SummaryPanelProps {
  documentId?: string;
  documentTitle?: string;
  summary?: PaperSummary | null;
  isLoading?: boolean;
  isGenerating?: boolean;
  onGenerateSummary?: () => void;
  documentFilename?: string;
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  content: string;
  subContent?: string;
  subTitle?: string;
  color: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  content,
  subContent,
  subTitle,
  color,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = subContent
      ? `${subTitle ? `${subTitle}: ${subContent}\n\n` : ""}${content}`
      : content;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      sx={{
        border: 1,
        borderColor: "divider",
        transition: "all 0.15s ease",
        "&:hover": {
          borderColor: color,
        },
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          p: 2.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          bgcolor: expanded ? alpha(color, 0.04) : "transparent",
          borderBottom: expanded ? 1 : 0,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: alpha(color, 0.12),
              color: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={copied ? "Copied!" : "Copy section"}>
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            sx={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <CardContent sx={{ p: 2.5 }}>
          {subContent && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: "background.default",
                border: 1,
                borderColor: "divider",
              }}
            >
              {subTitle && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                  }}
                >
                  {subTitle}
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                {subContent}
              </Typography>
            </Box>
          )}
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
            }}
          >
            {content || "Not found in the paper."}
          </Typography>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  documentId,
  documentTitle,
  summary: externalSummary,
  isLoading: externalLoading,
  isGenerating: externalGenerating,
  onGenerateSummary: externalOnGenerate,
  documentFilename = "paper",
}) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Self-managing mode if documentId provided and no external summary passed
  const queryEnabled = Boolean(documentId && externalSummary === undefined);
  const {
    data: fetchedSummary,
    isLoading: queryLoading,
  } = useQuery<PaperSummary | null>({
    queryKey: ["summary", documentId],
    queryFn: async () => {
      try {
        return await summaryApi.getSummary(documentId!);
      } catch {
        return null;
      }
    },
    enabled: queryEnabled,
  });

  const generateMutation = useMutation({
    mutationFn: () => summaryApi.createSummary(documentId!),
    onSuccess: (data) => {
      queryClient.setQueryData(["summary", documentId], data);
      setToastMessage("Summary generated successfully!");
    },
  });

  const summary = externalSummary !== undefined ? externalSummary : fetchedSummary;
  const isLoading = externalLoading !== undefined ? externalLoading : queryLoading;
  const isGenerating =
    externalGenerating !== undefined ? externalGenerating : generateMutation.isPending;
  const handleGenerate =
    externalOnGenerate || (() => generateMutation.mutate());

  const handleCopyAll = () => {
    if (!summary) return;
    const fullText = `# ${summary.title}\n**Authors:** ${summary.authors}\n\n## Abstract\n${summary.abstract}\n\n## Problem Statement\n${summary.problem_statement}\n\n## Methodology\n${summary.methodology}\n\n## Key Results\n${summary.key_results}\n\n## Conclusion\n${summary.conclusion}`;
    navigator.clipboard.writeText(fullText);
    setToastMessage("Full summary copied to clipboard!");
  };

  const handleExportMarkdown = () => {
    if (!summary) return;
    const fullText = `# ${summary.title}\n\n**Authors:** ${summary.authors}\n\n## Abstract\n${summary.abstract}\n\n## Problem Statement\n${summary.problem_statement}\n\n## Methodology\n${summary.methodology}\n\n## Key Results\n${summary.key_results}\n\n## Conclusion\n${summary.conclusion}`;
    const blob = new Blob([fullText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(documentTitle || documentFilename).replace(
      /\s+/g,
      "_"
    )}_summary.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage("Markdown file exported!");
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <SummarySkeleton />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box
        sx={{
          py: 8,
          px: 3,
          textAlign: "center",
          bgcolor: "background.paper",
          borderRadius: 3,
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <AutoAwesomeIcon
          sx={{ fontSize: 56, color: "secondary.main", mb: 2 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          No Structured Summary Yet
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", maxWidth: 460, mx: "auto", mb: 3 }}
        >
          Generate a 5-section academic AI summary including Title & Abstract,
          Problem Statement, Methodology, Key Results, and Conclusion.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={
            isGenerating ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <AutoAwesomeIcon />
            )
          }
          disabled={isGenerating}
          onClick={handleGenerate}
          sx={{
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.secondary.main, 0.4)}`,
            bgcolor: "secondary.main",
            "&:hover": { bgcolor: "secondary.dark" },
          }}
        >
          {isGenerating ? "Synthesizing Paper..." : "Generate AI Summary"}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Action Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          p: 1.5,
          bgcolor: "background.paper",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Structured 5-Part Summary
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon fontSize="small" />}
            onClick={handleCopyAll}
          >
            Copy All
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={handleExportMarkdown}
          >
            Export .md
          </Button>
          <Tooltip title="Regenerate Summary">
            <IconButton
              size="small"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <CircularProgress size={18} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 1. Title, Authors & Abstract */}
      <SectionCard
        title="1. Title, Authors & Abstract"
        icon={<MenuBookIcon fontSize="small" />}
        subTitle="Authors"
        subContent={summary.authors}
        content={summary.abstract}
        color={theme.palette.primary.main}
      />

      {/* 2. Problem Statement */}
      <SectionCard
        title="2. Problem Statement"
        icon={<ReportProblemIcon fontSize="small" />}
        content={summary.problem_statement}
        color={theme.palette.error.main}
      />

      {/* 3. Methodology */}
      <SectionCard
        title="3. Methodology & Technical Approach"
        icon={<ScienceIcon fontSize="small" />}
        content={summary.methodology}
        color={theme.palette.secondary.main}
      />

      {/* 4. Key Results */}
      <SectionCard
        title="4. Key Results & Findings"
        icon={<EmojiEventsIcon fontSize="small" />}
        content={summary.key_results}
        color={theme.palette.success.main}
      />

      {/* 5. Conclusion */}
      <SectionCard
        title="5. Conclusion & Future Directions"
        icon={<CheckCircleOutlineIcon fontSize="small" />}
        content={summary.conclusion}
        color={theme.palette.info.main}
      />

      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToastMessage(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
