import React from "react";

import {
  Box,
  TextField,
  MenuItem,
  Button,
  Paper,
  InputAdornment,
  Typography
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

const AdvancedReportFilters = ({
  search,
  setSearch,

  status,
  setStatus,

  grade,
  setGrade,

  riskLevel,
  setRiskLevel,

  severity,
  setSeverity,

  dateRange,
  setDateRange,

  onReset
}) => {

  return (

    <Paper
      elevation={0}
      sx={{
        bgcolor: "#111827",
        borderRadius: 4,
        p: 3,
        mb: 3,
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >

      <Typography
        variant="h6"
        sx={{
          color: "#fff",
          fontWeight: 700,
          mb: 3
        }}
      >
        Advanced Report Filters
      </Typography>


      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center"
        }}
      >

        {/* Search */}

        <TextField
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search language, report ID or vulnerability..."
          size="small"
          sx={{
            minWidth: 280,
            flex: 1,

            "& .MuiOutlinedInput-root": {
              color: "#fff",
              bgcolor: "#1d263b",

              "& fieldset": {
                borderColor: "#26324a"
              },

              "&:hover fieldset": {
                borderColor: "#00E5FF"
              },

              "&.Mui-focused fieldset": {
                borderColor: "#00E5FF"
              }
            },

            "& input::placeholder": {
              color: "#aaa",
              opacity: 1
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    color: "#00E5FF"
                  }}
                />
              </InputAdornment>
            )
          }}
        />


        {/* Status */}

        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
          size="small"
          sx={{
            minWidth: 140
          }}
        >

          <MenuItem value="">
            All Status
          </MenuItem>

          <MenuItem value="Safe">
            Safe
          </MenuItem>

          <MenuItem value="Unsafe">
            Unsafe
          </MenuItem>

        </TextField>


        {/* Security Grade */}

        <TextField
          select
          label="Security Grade"
          value={grade}
          onChange={(e) =>
            setGrade(e.target.value)
          }
          size="small"
          sx={{
            minWidth: 160
          }}
        >

          <MenuItem value="">
            All Grades
          </MenuItem>

          <MenuItem value="A">
            Grade A
          </MenuItem>

          <MenuItem value="B">
            Grade B
          </MenuItem>

          <MenuItem value="C">
            Grade C
          </MenuItem>

          <MenuItem value="D">
            Grade D
          </MenuItem>

          <MenuItem value="F">
            Grade F
          </MenuItem>

        </TextField>


        {/* Risk Level */}

        <TextField
          select
          label="Risk Level"
          value={riskLevel}
          onChange={(e) =>
            setRiskLevel(e.target.value)
          }
          size="small"
          sx={{
            minWidth: 150
          }}
        >

          <MenuItem value="">
            All Risks
          </MenuItem>

          <MenuItem value="Low">
            Low
          </MenuItem>

          <MenuItem value="Medium">
            Medium
          </MenuItem>

          <MenuItem value="High">
            High
          </MenuItem>

          <MenuItem value="Critical">
            Critical
          </MenuItem>

        </TextField>


        {/* Severity */}

        <TextField
          select
          label="Severity"
          value={severity}
          onChange={(e) =>
            setSeverity(e.target.value)
          }
          size="small"
          sx={{
            minWidth: 150
          }}
        >

          <MenuItem value="">
            All Severities
          </MenuItem>

          <MenuItem value="critical">
            Critical
          </MenuItem>

          <MenuItem value="high">
            High
          </MenuItem>

          <MenuItem value="medium">
            Medium
          </MenuItem>

          <MenuItem value="low">
            Low
          </MenuItem>

        </TextField>


        {/* Date Range */}

        <TextField
          select
          label="Scan Date"
          value={dateRange}
          onChange={(e) =>
            setDateRange(e.target.value)
          }
          size="small"
          sx={{
            minWidth: 160
          }}
        >

          <MenuItem value="">
            All Time
          </MenuItem>

          <MenuItem value="today">
            Today
          </MenuItem>

          <MenuItem value="7days">
            Last 7 Days
          </MenuItem>

          <MenuItem value="30days">
            Last 30 Days
          </MenuItem>

        </TextField>


        {/* Reset */}

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onReset}
          sx={{
            color: "#00E5FF",
            borderColor: "#00E5FF",

            "&:hover": {
              borderColor: "#00E5FF",
              bgcolor:
                "rgba(0,229,255,0.08)"
            }
          }}
        >
          Reset
        </Button>

      </Box>

    </Paper>

  );

};

export default AdvancedReportFilters;