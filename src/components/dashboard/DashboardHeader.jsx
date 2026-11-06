import React from "react";

import {
  Paper,
  Typography,
  Avatar,
  Box,
  Chip
} from "@mui/material";

import SecurityIcon from "@mui/icons-material/Security";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const DashboardHeader = () => {

  const username =
    localStorage.getItem("username") || "User";

  const today = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );

  return (

    <Paper
      elevation={0}
      sx={{
        background:
          "linear-gradient(135deg,#111827,#1E293B)",
        borderRadius: 4,
        p: 4,
        mb: 4,
        border: "1px solid rgba(0,229,255,.2)"
      }}
    >

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
      >

        {/* Left Side */}

        <Box>

          <Typography
            variant="h4"
            sx={{
              color: "#fff",
              fontWeight: 700
            }}
          >
            Welcome,
            {" "}
            {username}
            👋
          </Typography>

          <Typography
            sx={{
              color: "#B0BEC5",
              mt: 1,
              fontSize: 16
            }}
          >
            AI Cybersecurity Dashboard
          </Typography>

          <Chip
            icon={<CalendarMonthIcon />}
            label={today}
            sx={{
              mt: 2,
              bgcolor: "#263238",
              color: "#fff"
            }}
          />

        </Box>

        {/* Right Side */}

        <Box
          display="flex"
          alignItems="center"
          gap={2}
          mt={{
            xs: 3,
            md: 0
          }}
        >

          <Avatar
            sx={{
              bgcolor: "#00E5FF",
              width: 65,
              height: 65
            }}
          >
            <SecurityIcon
              sx={{
                fontSize: 35
              }}
            />
          </Avatar>

          <Box>

            <Typography
              sx={{
                color: "#fff",
                fontWeight: 600
              }}
            >
              System Status
            </Typography>

            <Typography
              sx={{
                color: "#4CAF50"
              }}
            >
              ● All Services Running
            </Typography>

          </Box>

        </Box>

      </Box>

    </Paper>

  );

};

export default DashboardHeader;