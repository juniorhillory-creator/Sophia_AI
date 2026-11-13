import React from "react";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import type { DocumentStatus, ProcessingStage } from "../../types";

interface StatusBadgeProps {
  status: DocumentStatus;
  stage?: ProcessingStage;
  size?: "small" | "medium";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, stage, size = "small" }) => {
  if (status === "ready") {
    return (
      <Chip
        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
        label="Ready"
        color="success"
        variant="outlined"
        size={size}
        sx={{ fontWeight: 600, fontSize: "0.75rem" }}
      />
    );
  }

  if (status === "processing") {
    const stageLabel = stage ? `Processing: ${stage}` : "Processing";
    return (
      <Chip
        icon={<CircularProgress size={12} color="inherit" />}
        label={stageLabel}
        color="warning"
        variant="outlined"
        size={size}
        sx={{ fontWeight: 600, fontSize: "0.75rem" }}
      />
    );
  }

  return (
    <Chip
      icon={<ErrorIcon sx={{ fontSize: "14px !important" }} />}
      label="Failed"
      color="error"
      variant="outlined"
      size={size}
      sx={{ fontWeight: 600, fontSize: "0.75rem" }}
    />
  );
};

