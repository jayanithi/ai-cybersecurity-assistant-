import React from "react";

import {
  Grid,
  Paper,
  Typography,
  Box
} from "@mui/material";

import SecurityIcon from "@mui/icons-material/Security";
import VerifiedIcon from "@mui/icons-material/Verified";
import DangerousIcon from "@mui/icons-material/Dangerous";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const DashboardCards = ({ analytics }) => {

  if (!analytics) return null;

  const cards = [

    {
      title: "Total Scans",
      value: analytics.totalScans,
      color: "#00E5FF",
      icon: <SecurityIcon sx={{ fontSize: 45 }} />
    },

    {
      title: "Safe Projects",
      value: analytics.safeProjects,
      color: "#4CAF50",
      icon: <VerifiedIcon sx={{ fontSize: 45 }} />
    },

    {
      title: "Unsafe Projects",
      value: analytics.unsafeProjects,
      color: "#FF5252",
      icon: <DangerousIcon sx={{ fontSize: 45 }} />
    },

    {
      title: "Average Risk",
      value: `${analytics.averageRisk}%`,
      color: "#FFC107",
      icon: <WarningAmberIcon sx={{ fontSize: 45 }} />
    },

    {
      title: "Security Grade",
      value: analytics.securityGrade,
      color: "#00BCD4",
      icon: <EmojiEventsIcon sx={{ fontSize: 45 }} />
    }

  ];

  return (

    <Grid container spacing={3} sx={{ mb: 4 }}>

      {cards.map((card, index) => (

        <Grid
          item
          xs={12}
          sm={6}
          md={4}
          lg={2.4}
          key={index}
        >

          <Paper
            elevation={0}
            sx={{

              bgcolor: "#111827",

              borderRadius: 4,

              p: 3,

              height: 180,

              display: "flex",

              flexDirection: "column",

              justifyContent: "space-between",

              border: `1px solid ${card.color}`,

              transition: "0.35s",

              "&:hover": {

                transform: "translateY(-8px)",

                boxShadow: `0 0 20px ${card.color}`

              }

            }}
          >

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >

              <Typography
                sx={{
                  color: "#B0BEC5",
                  fontSize: 15,
                  fontWeight: 600
                }}
              >
                {card.title}
              </Typography>

              <Box sx={{ color: card.color }}>
                {card.icon}
              </Box>

            </Box>

            <Typography
              variant="h3"
              sx={{
                color: card.color,
                fontWeight: 700
              }}
            >
              {card.value}
            </Typography>

          </Paper>

        </Grid>

      ))}

    </Grid>

  );

};

export default DashboardCards;