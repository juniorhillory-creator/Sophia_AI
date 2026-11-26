import React, { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import SearchIcon from "@mui/icons-material/SearchRounded";
import NoteAddIcon from "@mui/icons-material/NoteAddRounded";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import { useQuery } from "@tanstack/react-query";
import { DocumentCard } from "./DocumentCard";
import { DocumentCardSkeleton } from "../common/LoadingSkeleton";
import { fetchDocuments } from "../../api/documentApi";
import type { Document } from "../../types";

export interface DocumentListProps {
  documents?: Document[];
  isLoading?: boolean;
  onDeleteDocument?: (id: string) => Promise<void> | void;
  onOpenUpload?: () => void;
  onUploadClick?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents: externalDocs,
  isLoading: externalLoading,
  onDeleteDocument,
  onOpenUpload,
  onUploadClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "processing">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");

  const queryEnabled = externalDocs === undefined;
  const {
    data: fetchedDocs = [],
    isLoading: queryLoading,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: () => fetchDocuments(),
    enabled: queryEnabled,
  });

  const docs = externalDocs !== undefined ? externalDocs : fetchedDocs;
  const loading = externalLoading !== undefined ? externalLoading : queryLoading;
  const handleUploadClick = onUploadClick || onOpenUpload;

  const filteredDocuments = useMemo(() => {
    return docs
      .filter((doc) => {
        const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return a.filename.localeCompare(b.filename);
      });
  }, [docs, searchQuery, statusFilter, sortBy]);

  return (
    <Box>
      {/* Controls: Search, Filter Tabs, Sort */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          mb: 3,
        }}
      >
        <TextField
          placeholder="Search documents by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: "100%", md: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Tabs
            value={statusFilter}
            onChange={(_, val) => setStatusFilter(val)}
            sx={{
              minHeight: 38,
              bgcolor: "background.paper",
              borderRadius: 2,
              p: 0.5,
              border: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                minHeight: 32,
                py: 0.5,
                px: 2,
                borderRadius: 1.5,
                fontSize: "0.82rem",
                textTransform: "none",
                fontWeight: 600,
              },
            }}
          >
            <Tab value="all" label="All" />
            <Tab value="ready" label="Ready" />
            <Tab value="processing" label="Processing" />
          </Tabs>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "title")}
              displayEmpty
              sx={{ fontSize: "0.85rem" }}
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
              <MenuItem value="title">Alphabetical</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Grid of Documents or Loading Skeleton */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <DocumentCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : filteredDocuments.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <DocumentCard
                document={doc}
                onDelete={onDeleteDocument}
                onDeleted={() => refetch()}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
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
          <NoteAddIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {searchQuery ? "No matching documents found" : "No research papers yet"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
            {searchQuery
              ? `No papers match the query "${searchQuery}". Try different keywords.`
              : "Upload your first research paper in PDF format to generate AI summaries and explore with RAG."}
          </Typography>
          {handleUploadClick && (
            <Button
              variant="contained"
              startIcon={<NoteAddIcon />}
              onClick={handleUploadClick}
            >
              Upload Paper
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};
