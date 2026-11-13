import React from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";

export interface ErrorAlertProps {
  title?: string;
  message?: string;
  error?: string | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = "Something went wrong",
  message,
  error,
  onRetry,
  onDismiss,
}) => {
  const displayText =
    message ||
    (error instanceof Error ? error.message : typeof error === "string" ? error : "An unexpected error occurred.");

  return (
    <Alert
      severity="error"
      sx={{ borderRadius: 2 }}
      onClose={onDismiss}
      action={
        onRetry && (
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
          >
            Retry
          </Button>
        )
      }
    >
      <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
      {displayText}
    </Alert>
  );
};
