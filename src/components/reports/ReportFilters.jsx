import React from "react";

import {
  Box,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
  Paper
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

const ReportFilters = ({
  search,
  setSearch,

  status,
  setStatus,

  grade,
  setGrade,

  riskLevel,
  setRiskLevel,

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
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center"
        }}
      >
        {/* ===============================
            Search Reports
        =============================== */}

        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search language..."
          size="small"
          sx={{
            minWidth: 220,
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

        {/* ===============================
            Status Filter
        =============================== */}

        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          size="small"
          sx={{
            minWidth: 150,
            "& .MuiOutlinedInput-root": {
              color: "#fff",
              bgcolor: "#1d263b"
            },

            "& .MuiInputLabel-root": {
              color: "#aaa"
            },

            "& .MuiSvgIcon-root": {
              color: "#fff"
            }
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

        {/* ===============================
            Security Grade Filter
        =============================== */}

        <TextField
          select
          label="Security Grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          size="small"
          sx={{
            minWidth: 170,
            "& .MuiOutlinedInput-root": {
              color: "#fff",
              bgcolor: "#1d263b"
            },

            "& .MuiInputLabel-root": {
              color: "#aaa"
            },

            "& .MuiSvgIcon-root": {
              color: "#fff"
            }
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

        {/* ===============================
            Risk Level Filter
        =============================== */}

        <TextField
          select
          label="Risk Level"
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          size="small"
          sx={{
            minWidth: 150,
            "& .MuiOutlinedInput-root": {
              color: "#fff",
              bgcolor: "#1d263b"
            },

            "& .MuiInputLabel-root": {
              color: "#aaa"
            },

            "& .MuiSvgIcon-root": {
              color: "#fff"
            }
          }}
        >
          <MenuItem value="">
            All Risk Levels
          </MenuItem>

          <MenuItem value="Low">
            Low Risk
          </MenuItem>

          <MenuItem value="Medium">
            Medium Risk
          </MenuItem>

          <MenuItem value="High">
            High Risk
          </MenuItem>

          <MenuItem value="Critical">
            Critical Risk
          </MenuItem>
        </TextField>

        {/* ===============================
            Reset Filters
        =============================== */}

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onReset}
          sx={{
            color: "#00E5FF",
            borderColor: "#00E5FF",

            "&:hover": {
              borderColor: "#00E5FF",
              bgcolor: "rgba(0,229,255,0.08)"
            }
          }}
        >
          Reset
        </Button>

      </Box>
    </Paper>
  );
};

export default ReportFilters;