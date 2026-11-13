import React from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";

export const DocumentCardSkeleton: React.FC = () => (
  <Card sx={{ height: "100%" }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="rounded" width={70} height={24} />
      </Box>
      <Skeleton variant="text" sx={{ fontSize: "1.1rem", mb: 1 }} width="85%" />
      <Skeleton variant="text" sx={{ fontSize: "0.85rem", mb: 2 }} width="50%" />
      <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1 }}>
        <Skeleton variant="text" width={60} />
        <Skeleton variant="rounded" width={80} height={32} />
      </Box>
    </CardContent>
  </Card>
);

export const SummarySkeleton: React.FC = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Card key={i}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="text" width={200} height={32} />
          </Box>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="95%" />
          <Skeleton variant="text" width="75%" />
        </CardContent>
      </Card>
    ))}
  </Box>
);

interface LoadingSkeletonProps {
  type?: "card" | "summary" | "row";
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = "card",
  count = 3,
}) => {
  if (type === "summary") {
    return <SummarySkeleton />;
  }

  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <DocumentCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
};
