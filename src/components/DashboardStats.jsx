import React from "react";
import { Grid, Paper, Typography, Box } from "@mui/material";

const DashboardStats = ({ stats }) => {
  const cards = [
    {
      title: "Total Scans",
      value: stats.totalScans,
      color: "#00E5FF"
    },
    {
      title: "Critical Issues",
      value: stats.critical,
      color: "#FF1744"
    },
    {
      title: "Medium Issues",
      value: stats.medium,
      color: "#FFAB00"
    },
    {
      title: "Safe Files",
      value: stats.safe,
      color: "#00C853"
    }
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.title}>
          <Paper
            sx={{
              p: 3,
              bgcolor: "#111a2e",
              color: "#fff",
              borderRadius: 3
            }}
          >
            <Typography variant="body2">
              {card.title}
            </Typography>

            <Box
              sx={{
                mt: 2,
                color: card.color
              }}
            >
              <Typography variant="h4">
                {card.value}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default DashboardStats;