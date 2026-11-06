import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Button,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";

import SecurityIcon from "@mui/icons-material/Security";
import BugReportIcon from "@mui/icons-material/BugReport";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ShieldIcon from "@mui/icons-material/Shield";
import SpeedIcon from "@mui/icons-material/Speed";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

import Editor from "@monaco-editor/react";

import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";

import VulnerabilityDetailsDialog from
  "../components/vulnerabilities/VulnerabilityDetailsDialog";

import {
  createScanContext,
  saveScanContext,
} from "../utils/scanContext";

import API from "../services/api";

// ============================================================
// DEFAULT CODE
// ============================================================

const DEFAULT_CODE = {
  python: `def login(username, password):
    query = "SELECT * FROM users WHERE username='" + username + "'"
    return query
`,

  javascript: `function login(username, password) {
  const query =
    "SELECT * FROM users WHERE username='" +
    username +
    "'";

  return query;
}
`,

  php: `<?php

function login($username, $password) {

  $query =
    "SELECT * FROM users WHERE username='" .
    $username .
    "'";

  return $query;
}

?>`,

  java: `public class Main {

  public static void main(String[] args) {

    String username = "admin";

    String query =
      "SELECT * FROM users WHERE username='" +
      username +
      "'";

    System.out.println(query);
  }
}
`,
};

// ============================================================
// LANGUAGE OPTIONS
// ============================================================

const LANGUAGE_OPTIONS = [
  "python",
  "javascript",
  "php",
  "java",
];

// ============================================================
// SEVERITY CONFIG
// ============================================================

const getSeverityConfig = (severity) => {
  const value = String(
    severity || ""
  ).toLowerCase();

  switch (value) {
    case "critical":
      return {
        color: "#FF1744",
        bg: "rgba(255,23,68,0.12)",
        border: "rgba(255,23,68,0.35)",
      };

    case "high":
      return {
        color: "#FF5252",
        bg: "rgba(255,82,82,0.12)",
        border: "rgba(255,82,82,0.35)",
      };

    case "medium":
      return {
        color: "#FFC107",
        bg: "rgba(255,193,7,0.12)",
        border: "rgba(255,193,7,0.35)",
      };

    case "low":
      return {
        color: "#00E676",
        bg: "rgba(0,230,118,0.12)",
        border: "rgba(0,230,118,0.35)",
      };

    default:
      return {
        color: "#9CA3AF",
        bg: "rgba(156,163,175,0.12)",
        border: "rgba(156,163,175,0.3)",
      };
  }
};

// ============================================================
// RISK SCORE CONFIG
// ============================================================

const getRiskScoreConfig = (riskScore) => {
  const score = Number(riskScore);

  if (Number.isNaN(score)) {
    return {
      color: "#9CA3AF",
      label: "Unknown",
      bg: "rgba(156,163,175,0.12)",
      border: "rgba(156,163,175,0.35)",
    };
  }

  if (score >= 80) {
    return {
      color: "#FF1744",
      label: "Critical Risk",
      bg: "rgba(255,23,68,0.12)",
      border: "rgba(255,23,68,0.35)",
    };
  }

  if (score >= 60) {
    return {
      color: "#FF5252",
      label: "High Risk",
      bg: "rgba(255,82,82,0.12)",
      border: "rgba(255,82,82,0.35)",
    };
  }

  if (score >= 30) {
    return {
      color: "#FFC107",
      label: "Medium Risk",
      bg: "rgba(255,193,7,0.12)",
      border: "rgba(255,193,7,0.35)",
    };
  }

  if (score > 0) {
    return {
      color: "#00E676",
      label: "Low Risk",
      bg: "rgba(0,230,118,0.12)",
      border: "rgba(0,230,118,0.35)",
    };
  }

  return {
    color: "#00E676",
    label: "Safe",
    bg: "rgba(0,230,118,0.12)",
    border: "rgba(0,230,118,0.35)",
  };
};

// ============================================================
// NORMALIZE VULNERABILITY
// ============================================================

const normalizeVulnerability = (
  vulnerability,
  index = 0
) => {
  if (!vulnerability) {
    return null;
  }

  return {
    ...vulnerability,

    id:
      vulnerability.id ||
      vulnerability._id ||
      vulnerability.vulnerability_id ||
      "vulnerability-" + index,

    type:
      vulnerability.type ||
      vulnerability.name ||
      vulnerability.title ||
      vulnerability.vulnerability?.type ||
      "Security Vulnerability",

    name:
      vulnerability.name ||
      vulnerability.type ||
      vulnerability.title ||
      vulnerability.vulnerability?.name ||
      "Security Vulnerability",

    severity:
      vulnerability.severity ||
      vulnerability.level ||
      vulnerability.vulnerability?.severity ||
      "Unknown",

    description:
      vulnerability.description ||
      vulnerability.message ||
      vulnerability.details ||
      vulnerability.vulnerability?.description ||
      "No description available.",

    line:
      vulnerability.line ??
      vulnerability.lineNumber ??
      vulnerability.line_number ??
      vulnerability.vulnerability?.line ??
      "Unknown",

    cwe:
      vulnerability.cwe ||
      vulnerability.CWE ||
      vulnerability.cwe_id ||
      vulnerability.vulnerability?.cwe ||
      "Not specified",

    recommendation:
      vulnerability.recommendation ||
      vulnerability.fix ||
      vulnerability.remediation ||
      vulnerability.solution ||
      "",
  };
};

// ============================================================
// API BASE URL
// ============================================================

const getApiBaseUrl = () => {
  try {
    const baseUrl = API?.defaults?.baseURL;

    if (
      typeof baseUrl === "string" &&
      baseUrl.trim()
    ) {
      return baseUrl
        .trim()
        .replace(/\/+$/, "");
    }
  } catch (error) {
    console.warn(
      "Unable to read Axios baseURL:",
      error
    );
  }

  return "";
};

// ============================================================
// AUTH TOKEN
// ============================================================

const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

// ============================================================
// EXTRACT ERROR MESSAGE
// ============================================================

const extractErrorMessage = (
  data,
  fallback
) => {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data || fallback;
  }

  return (
    data.message ||
    data.error ||
    data.detail ||
    data?.data?.message ||
    data?.data?.error ||
    fallback
  );
};

// ============================================================
// SCAN RESULTS COMPONENT
// ============================================================

const ScanResults = ({
  scanResult,
  language,
  onVulnerabilitySelect,
  onAskAI,
}) => {

  // ==========================================================
  // RISK SCORE
  // ==========================================================

  const rawRiskScore =
    scanResult?.riskScore ??
    scanResult?.risk_score ??
    scanResult?.risk ??
    scanResult?.score ??
    0;

  const riskScoreNumber =
    Number(rawRiskScore);

  const riskScore =
    Number.isFinite(
      riskScoreNumber
    )
      ? Math.max(
          0,
          Math.min(
            100,
            riskScoreNumber
          )
        )
      : 0;

  // ==========================================================
  // GRADE
  // ==========================================================

  const grade =
    scanResult?.grade ??
    scanResult?.securityGrade ??
    scanResult?.security_grade ??
    "N/A";

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  const rawConfidence =
    scanResult?.confidence ??
    scanResult?.confidenceScore ??
    scanResult?.confidence_score ??
    0;

  const confidenceNumber =
    Number(rawConfidence);

  const confidence =
    Number.isFinite(
      confidenceNumber
    )
      ? Math.max(
          0,
          Math.min(
            100,
            confidenceNumber
          )
        )
      : 0;

  // ==========================================================
  // STATUS
  // ==========================================================

  const status =
    scanResult?.status ??
    scanResult?.scanStatus ??
    scanResult?.scan_status ??
    (riskScore === 0
      ? "Safe"
      : "Unsafe");

  // ==========================================================
  // RISK SCORE CONFIG
  // ==========================================================

  const riskConfig =
    getRiskScoreConfig(
      riskScore
    );

  // ==========================================================
  // GET VULNERABILITIES
  // ==========================================================

  const rawVulnerabilities =
    Array.isArray(
      scanResult?.vulnerabilities
    )
      ? scanResult.vulnerabilities
      : Array.isArray(
          scanResult?.issues
        )
        ? scanResult.issues
        : Array.isArray(
            scanResult?.results
          )
          ? scanResult.results
          : [];

  const vulnerabilities =
    rawVulnerabilities
      .map(
        (
          vulnerability,
          index
        ) =>
          normalizeVulnerability(
            vulnerability,
            index
          )
      )
      .filter(Boolean);

  // ==========================================================
  // TOTAL ISSUES
  // ==========================================================

  const totalIssues =
    scanResult?.totalIssues ??
    scanResult?.total_issues ??
    scanResult?.issueCount ??
    vulnerabilities.length;

  // ==========================================================
  // SEVERITY COUNTS
  // ==========================================================

  const criticalCount =
    vulnerabilities.filter(
      (item) =>
        String(
          item.severity
        ).toLowerCase() ===
        "critical"
    ).length;

  const highCount =
    vulnerabilities.filter(
      (item) =>
        String(
          item.severity
        ).toLowerCase() ===
        "high"
    ).length;

  const mediumCount =
    vulnerabilities.filter(
      (item) =>
        String(
          item.severity
        ).toLowerCase() ===
        "medium"
    ).length;

  const lowCount =
    vulnerabilities.filter(
      (item) =>
        String(
          item.severity
        ).toLowerCase() ===
        "low"
    ).length;

  // ==========================================================
  // SAFE STATE
  // ==========================================================

  const isSafe =
    vulnerabilities.length === 0 &&
    String(status).toLowerCase() !==
      "unsafe";

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Box sx={{ mt: 4 }}>

      <Paper
        elevation={6}
        sx={{
          bgcolor: "#111827",
          p: 3,
          borderRadius: 4,
          border:
            "1px solid rgba(255,255,255,0.05)",
        }}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          justifyContent="space-between"
          alignItems={{
            xs: "stretch",
            sm: "center",
          }}
          spacing={2}
        >

          <Box>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
            >

              <SecurityIcon
                sx={{
                  color: "#00E5FF",
                  fontSize: 30,
                }}
              />

              <Typography
                variant="h5"
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                Security Scan Results
              </Typography>

            </Stack>

            <Typography
              sx={{
                color: "#9CA3AF",
                mt: 1,
              }}
            >
              Security analysis results for your{" "}
              {language || "source code"}
            </Typography>

          </Box>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={1}
          >

            <Chip
              icon={<BugReportIcon />}
              label={
                String(totalIssues) +
                " Issues Found"
              }
              color={
                totalIssues > 0
                  ? "warning"
                  : "success"
              }
              sx={{
                fontWeight: 700,
              }}
            />

            <Button
              variant="contained"
              startIcon={
                <SmartToyIcon />
              }
              onClick={() => {
                if (onAskAI) {
                  onAskAI(null);
                }
              }}
              sx={{
                bgcolor: "#7C3AED",
                fontWeight: 700,

                "&:hover": {
                  bgcolor: "#6D28D9",
                },
              }}
            >
              Ask AI
            </Button>

          </Stack>

        </Stack>

        <Divider
          sx={{
            my: 3,
            borderColor:
              "rgba(255,255,255,0.08)",
          }}
        />

        {/* ==================================================
            RISK SCORE
        ================================================== */}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,

            background:
              "linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,58,237,0.06))",

            border:
              "1px solid rgba(0,229,255,0.15)",
          }}
        >

          <Grid
            container
            spacing={3}
            alignItems="center"
          >

            <Grid
              item
              xs={12}
              md={5}
            >

              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
              >

                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    background:
                      riskConfig.bg,

                    border:
                      "2px solid " +
                      riskConfig.border,

                    flexShrink: 0,
                  }}
                >

                  <Typography
                    sx={{
                      color:
                        riskConfig.color,

                      fontSize: 22,

                      fontWeight: 800,
                    }}
                  >
                    {riskScore}
                  </Typography>

                </Box>

                <Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >

                    <ShieldIcon
                      sx={{
                        color:
                          riskConfig.color,
                      }}
                    />

                    <Typography
                      sx={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      Risk Score
                    </Typography>

                  </Stack>

                  <Typography
                    sx={{
                      color:
                        riskConfig.color,
                      fontWeight: 700,
                      mt: 0.5,
                    }}
                  >
                    {riskConfig.label}
                  </Typography>

                  <Typography
                    sx={{
                      color: "#9CA3AF",
                      fontSize: 13,
                      mt: 0.5,
                    }}
                  >
                    Security risk level from 0 to 100
                  </Typography>

                </Box>

              </Stack>

            </Grid>

            <Grid
              item
              xs={12}
              md={4}
            >

              <Typography
                sx={{
                  color: "#B0BEC5",
                  fontSize: 13,
                  mb: 1,
                }}
              >
                Risk Level
              </Typography>

              <LinearProgress
                variant="determinate"
                value={riskScore}
                sx={{
                  height: 10,
                  borderRadius: 10,
                  backgroundColor:
                    "rgba(255,255,255,0.08)",

                  "& .MuiLinearProgress-bar":
                    {
                      backgroundColor:
                        riskConfig.color,

                      borderRadius: 10,
                    },
                }}
              />

              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mt: 0.8 }}
              >

                <Typography
                  sx={{
                    color: "#00E676",
                    fontSize: 11,
                  }}
                >
                  Safe
                </Typography>

                <Typography
                  sx={{
                    color: "#FF1744",
                    fontSize: 11,
                  }}
                >
                  Critical
                </Typography>

              </Stack>

            </Grid>

            <Grid
              item
              xs={12}
              md={3}
            >

              <Stack
                direction="row"
                spacing={1.5}
              >

                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    textAlign: "center",
                    bgcolor:
                      "rgba(255,255,255,0.04)",
                    borderRadius: 2,
                  }}
                >

                  <Typography
                    sx={{
                      color: "#9CA3AF",
                      fontSize: 12,
                    }}
                  >
                    Grade
                  </Typography>

                  <Typography
                    sx={{
                      color: "#00E5FF",
                      fontSize: 26,
                      fontWeight: 800,
                    }}
                  >
                    {grade}
                  </Typography>

                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    textAlign: "center",
                    bgcolor:
                      "rgba(255,255,255,0.04)",
                    borderRadius: 2,
                  }}
                >

                  <Typography
                    sx={{
                      color: "#9CA3AF",
                      fontSize: 12,
                    }}
                  >
                    Confidence
                  </Typography>

                  <Typography
                    sx={{
                      color: "#00E676",
                      fontSize: 26,
                      fontWeight: 800,
                    }}
                  >
                    {confidence}%
                  </Typography>

                </Paper>

              </Stack>

            </Grid>

          </Grid>

          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >

            <Chip
              icon={
                status &&
                String(status).toLowerCase() ===
                  "safe" ? (
                  <VerifiedUserIcon />
                ) : (
                  <WarningAmberIcon />
                )
              }
              label={
                "Scan Status: " +
                status
              }
              sx={{
                color:
                  String(status).toLowerCase() ===
                  "safe"
                    ? "#00E676"
                    : "#FF5252",

                bgcolor:
                  String(status).toLowerCase() ===
                  "safe"
                    ? "rgba(0,230,118,0.08)"
                    : "rgba(255,82,82,0.08)",

                border:
                  "1px solid " +
                  (
                    String(status).toLowerCase() ===
                    "safe"
                      ? "rgba(0,230,118,0.25)"
                      : "rgba(255,82,82,0.25)"
                  ),

                fontWeight: 700,
              }}
            />

          </Box>

        </Paper>

        {/* ==================================================
            SEVERITY SUMMARY
        ================================================== */}

        {!isSafe && (

          <Grid
            container
            spacing={2}
          >

            <Grid
              item
              xs={6}
              md={3}
            >

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor:
                    "rgba(255,23,68,0.08)",
                  borderRadius: 3,
                }}
              >

                <Typography
                  sx={{
                    color: "#FF1744",
                  }}
                >
                  Critical
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {criticalCount}
                </Typography>

              </Paper>

            </Grid>

            <Grid
              item
              xs={6}
              md={3}
            >

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor:
                    "rgba(255,82,82,0.08)",
                  borderRadius: 3,
                }}
              >

                <Typography
                  sx={{
                    color: "#FF5252",
                  }}
                >
                  High
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {highCount}
                </Typography>

              </Paper>

            </Grid>

            <Grid
              item
              xs={6}
              md={3}
            >

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor:
                    "rgba(255,193,7,0.08)",
                  borderRadius: 3,
                }}
              >

                <Typography
                  sx={{
                    color: "#FFC107",
                  }}
                >
                  Medium
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {mediumCount}
                </Typography>

              </Paper>

            </Grid>

            <Grid
              item
              xs={6}
              md={3}
            >

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor:
                    "rgba(0,230,118,0.08)",
                  borderRadius: 3,
                }}
              >

                <Typography
                  sx={{
                    color: "#00E676",
                  }}
                >
                  Low
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {lowCount}
                </Typography>

              </Paper>

            </Grid>

          </Grid>

        )}

        {/* ==================================================
            SAFE STATE
        ================================================== */}

        {isSafe && (

          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 4,
              textAlign: "center",
              bgcolor:
                "rgba(0,230,118,0.05)",
              borderRadius: 3,
              border:
                "1px solid rgba(0,230,118,0.2)",
            }}
          >

            <CheckCircleIcon
              sx={{
                fontSize: 55,
                color: "#00E676",
                mb: 1,
              }}
            />

            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              No Security Vulnerabilities Found
            </Typography>

            <Typography
              sx={{
                color: "#9CA3AF",
                mt: 1,
              }}
            >
              The scanner did not detect any known
              security vulnerabilities in this source code.
            </Typography>

          </Paper>

        )}

        {/* ==================================================
            VULNERABILITY LIST
        ================================================== */}

        {!isSafe && (

          <Box sx={{ mt: 4 }}>

            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                fontWeight: 700,
                mb: 2,
              }}
            >
              Detected Vulnerabilities
            </Typography>

            <Stack spacing={2}>

              {vulnerabilities.map(
                (
                  vulnerability,
                  index
                ) => {

                  const severityConfig =
                    getSeverityConfig(
                      vulnerability.severity
                    );

                  return (

                    <Paper
                      key={
                        vulnerability.id ||
                        index
                      }
                      elevation={0}
                      sx={{
                        bgcolor: "#1A2235",
                        p: 3,
                        borderRadius: 3,
                        border:
                          "1px solid " +
                          severityConfig.border,
                      }}
                    >

                      <Stack
                        direction={{
                          xs: "column",
                          md: "row",
                        }}
                        justifyContent="space-between"
                        spacing={2}
                      >

                        <Box sx={{ flex: 1 }}>

                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ mb: 1.5 }}
                          >

                            <WarningAmberIcon
                              sx={{
                                color:
                                  severityConfig.color,
                              }}
                            />

                            <Typography
                              variant="h6"
                              sx={{
                                color: "#fff",
                                fontWeight: 700,
                              }}
                            >
                              {vulnerability.type}
                            </Typography>

                          </Stack>

                          <Typography
                            sx={{
                              color: "#B0BEC5",
                              lineHeight: 1.7,
                              mb: 2,
                            }}
                          >
                            {vulnerability.description}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >

                            <Chip
                              label={
                                vulnerability.severity
                              }
                              size="small"
                              sx={{
                                bgcolor:
                                  severityConfig.bg,

                                color:
                                  severityConfig.color,

                                fontWeight: 700,

                                border:
                                  "1px solid " +
                                  severityConfig.border,
                              }}
                            />

                            <Chip
                              label={
                                "Line: " +
                                vulnerability.line
                              }
                              size="small"
                              variant="outlined"
                              sx={{
                                color: "#FFC107",
                                borderColor:
                                  "rgba(255,193,7,0.4)",
                              }}
                            />

                            <Chip
                              label={
                                "CWE: " +
                                vulnerability.cwe
                              }
                              size="small"
                              variant="outlined"
                              sx={{
                                color: "#00E5FF",
                                borderColor:
                                  "rgba(0,229,255,0.4)",
                              }}
                            />

                          </Stack>

                          {vulnerability.recommendation && (

                            <Box
                              sx={{
                                mt: 2,
                                p: 2,
                                borderRadius: 2,
                                bgcolor:
                                  "rgba(0,229,255,0.04)",
                              }}
                            >

                              <Typography
                                sx={{
                                  color: "#00E5FF",
                                  fontWeight: 600,
                                  mb: 0.5,
                                }}
                              >
                                Recommendation
                              </Typography>

                              <Typography
                                sx={{
                                  color: "#B0BEC5",
                                }}
                              >
                                {
                                  vulnerability.recommendation
                                }
                              </Typography>

                            </Box>

                          )}

                        </Box>

                        <Stack
                          spacing={1}
                          minWidth={{
                            md: 150,
                          }}
                        >

                          <Button
                            variant="outlined"
                            startIcon={
                              <VisibilityIcon />
                            }
                            onClick={() => {

                              if (
                                onVulnerabilitySelect
                              ) {

                                onVulnerabilitySelect(
                                  vulnerability
                                );

                              }

                            }}
                            sx={{
                              color: "#00E5FF",
                              borderColor:
                                "rgba(0,229,255,0.5)",
                            }}
                          >
                            View Details
                          </Button>

                          <Button
                            variant="contained"
                            startIcon={
                              <SmartToyIcon />
                            }
                            onClick={() => {

                              if (onAskAI) {

                                onAskAI(
                                  vulnerability
                                );

                              }

                            }}
                            sx={{
                              bgcolor: "#7C3AED",

                              "&:hover": {
                                bgcolor: "#6D28D9",
                              },
                            }}
                          >
                            Ask AI
                          </Button>

                        </Stack>

                      </Stack>

                    </Paper>

                  );
                }
              )}

            </Stack>

          </Box>

        )}

      </Paper>

    </Box>
  );
};

// ============================================================
// MAIN SCANNER COMPONENT
// ============================================================

const Scanner = () => {

  const navigate = useNavigate();

  // ==========================================================
  // STATES
  // ==========================================================

  const [language, setLanguage] =
    useState("python");

  const [code, setCode] =
    useState(DEFAULT_CODE.python);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [scanResult, setScanResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [fixedCode, setFixedCode] =
    useState("");

  const [fixLoading, setFixLoading] =
    useState(false);

  const [fixError, setFixError] =
    useState("");

  const [
    selectedVulnerability,
    setSelectedVulnerability,
  ] = useState(null);

  const [
    vulnerabilityDialogOpen,
    setVulnerabilityDialogOpen,
  ] = useState(false);

  // ==========================================================
  // STREAM ABORT CONTROLLER
  // ==========================================================

  const fixAbortControllerRef =
    useRef(null);

  // ==========================================================
  // CLEANUP ON UNMOUNT
  // ==========================================================

  useEffect(() => {
    return () => {
      if (
        fixAbortControllerRef.current
      ) {
        try {
          fixAbortControllerRef.current.abort();
        } catch (error) {
          console.warn(
            "Fix stream cleanup error:",
            error
          );
        }

        fixAbortControllerRef.current =
          null;
      }
    };
  }, []);

  // ==========================================================
  // LANGUAGE CHANGE
  // ==========================================================

  const handleLanguageChange = (
    event
  ) => {

    const newLanguage =
      event.target.value;

    setLanguage(newLanguage);

    setCode(
      DEFAULT_CODE[newLanguage] || ""
    );

    setSelectedFile(null);
    setScanResult(null);
    setFixedCode("");
    setFixError("");
    setError("");
    setSelectedVulnerability(null);
    setVulnerabilityDialogOpen(false);
  };

  // ==========================================================
  // FILE UPLOAD
  // ==========================================================

  const handleFileUpload = (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setError("");
    setFixError("");
    setFixedCode("");
    setScanResult(null);
    setSelectedVulnerability(null);
    setVulnerabilityDialogOpen(false);

    const reader =
      new FileReader();

    reader.onload =
      (readerEvent) => {

        const fileContent =
          readerEvent.target.result;

        setCode(
          typeof fileContent === "string"
            ? fileContent
            : ""
        );
      };

    reader.onerror = () => {

      setError(
        "Failed to read the selected file."
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  };

  // ==========================================================
  // SCAN CODE
  // ==========================================================

  const handleScan = async () => {

    if (!code?.trim()) {

      setError(
        "Please enter or upload source code before scanning."
      );

      return;
    }

    if (!language) {

      setError(
        "Please select a programming language."
      );

      return;
    }

    try {

      setLoading(true);
      setError("");
      setFixedCode("");
      setFixError("");
      setSelectedVulnerability(null);
      setVulnerabilityDialogOpen(false);

      const token =
        getAuthToken();

      const response =
        await API.post(
          "/scanner/scan",
          {
            code,
            language,
          },
          {
            headers: token
              ? {
                  Authorization:
                    "Bearer " + token,
                }
              : {},
          }
        );

      console.log(
        "Scan API Response:",
        response.data
      );

      // ======================================================
      // EXTRACT RESULT
      // ======================================================

      const resultData =
        response.data?.result ||
        response.data?.scanResult ||
        response.data?.data ||
        response.data;

      if (!resultData) {

        throw new Error(
          "Scanner returned an empty response."
        );
      }

      // ======================================================
      // DEBUG RISK SCORE
      // ======================================================

      console.log(
        "Risk Score:",
        resultData?.riskScore
      );

      console.log(
        "Risk Score snake_case:",
        resultData?.risk_score
      );

      console.log(
        "Grade:",
        resultData?.grade
      );

      console.log(
        "Confidence:",
        resultData?.confidence
      );

      console.log(
        "Status:",
        resultData?.status
      );

      // ======================================================
      // SAVE RESULT
      // ======================================================

      setScanResult({
        ...resultData,

        riskScore:
          resultData?.riskScore ??
          resultData?.risk_score ??
          resultData?.risk ??
          resultData?.score ??
          0,

        grade:
          resultData?.grade ??
          resultData?.securityGrade ??
          resultData?.security_grade ??
          "N/A",

        confidence:
          resultData?.confidence ??
          resultData?.confidenceScore ??
          resultData?.confidence_score ??
          0,

        status:
          resultData?.status ??
          resultData?.scanStatus ??
          resultData?.scan_status ??
          "Unknown",
      });

      // ======================================================
      // SAVE SCAN CONTEXT
      // ======================================================

      const scanContext =
        createScanContext({
          scanResult: resultData,
          code,
          language,
          fileName:
            selectedFile?.name ||
            "Source Code",
        });

      saveScanContext(
        scanContext
      );

    } catch (err) {

      console.error(
        "Scan Error:",
        err
      );

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to scan the source code.";

      setError(message);

      setScanResult(null);

    } finally {

      setLoading(false);
    }
  };

  // ==========================================================
  // PROCESS AI FIX STREAM
  // ==========================================================

  const processSecureFixStream =
    async (
      response,
      controller
    ) => {

      if (
        !response.body
      ) {
        throw new Error(
          "AI fix response stream is unavailable."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder("utf-8");

      let buffer = "";

      let receivedText = "";

      let receivedStructuredResponse =
        false;

      const appendText = (text) => {

        if (
          typeof text !== "string" ||
          !text
        ) {
          return;
        }

        receivedText += text;

        setFixedCode(
          receivedText
        );
      };

      const processObject = (
        data
      ) => {

        if (!data) {
          return;
        }

        // ----------------------------------------------------
        // ERROR RESPONSE
        // ----------------------------------------------------

        if (
          data.success === false ||
          data.error
        ) {

          throw new Error(
            data.message ||
            data.error ||
            "AI failed to generate secure fix."
          );
        }

        // ----------------------------------------------------
        // STREAM CHUNK
        // ----------------------------------------------------

        const chunk =
          data.chunk ??
          data.token ??
          data.delta ??
          data.text ??
          data.content;

        if (
          typeof chunk === "string" &&
          chunk
        ) {

          receivedStructuredResponse =
            true;

          appendText(chunk);

          return;
        }

        // ----------------------------------------------------
        // COMPLETE FIX RESPONSE
        // ----------------------------------------------------

        const completeFix =
          data.fix ??
          data.secureFix ??
          data.secure_fix ??
          data.response ??
          data.result?.fix ??
          data.data?.fix;

        if (
          typeof completeFix === "string" &&
          completeFix
        ) {

          receivedStructuredResponse =
            true;

          if (
            completeFix.length >=
            receivedText.length
          ) {
            receivedText =
              completeFix;

            setFixedCode(
              completeFix
            );
          }

          return;
        }

        // ----------------------------------------------------
        // DONE
        // ----------------------------------------------------

        if (
          data.done === true
        ) {

          return;
        }
      };

      const processLine = (
        rawLine
      ) => {

        let line =
          String(
            rawLine || ""
          ).trim();

        if (!line) {
          return;
        }

        // SSE compatibility
        if (
          line.startsWith("data:")
        ) {
          line =
            line.slice(5).trim();
        }

        if (
          !line ||
          line === "[DONE]"
        ) {
          return;
        }

        // ----------------------------------------------------
        // JSON / NDJSON
        // ----------------------------------------------------

        if (
          line.startsWith("{") ||
          line.startsWith("[")
        ) {

          try {

            const parsed =
              JSON.parse(line);

            if (
              Array.isArray(parsed)
            ) {

              parsed.forEach(
                processObject
              );

            } else {

              processObject(
                parsed
              );
            }

            return;

          } catch (error) {

            // Not complete JSON yet.
            // Keep it as plain text.
          }
        }

        // ----------------------------------------------------
        // PLAIN TEXT FALLBACK
        // ----------------------------------------------------

        if (
          !receivedStructuredResponse
        ) {
          appendText(line);
        }
      };

      while (true) {

        if (
          controller.signal.aborted
        ) {

          throw new DOMException(
            "Request aborted",
            "AbortError"
          );
        }

        const {
          done,
          value,
        } =
          await reader.read();

        if (done) {
          break;
        }

        const decoded =
          decoder.decode(
            value,
            {
              stream: true,
            }
          );

        buffer += decoded;

        const lines =
          buffer.split(/\r?\n/);

        buffer =
          lines.pop() || "";

        for (
          const line of lines
        ) {

          processLine(line);
        }
      }

      // Process decoder remainder
      buffer +=
        decoder.decode();

      if (
        buffer.trim()
      ) {
        processLine(buffer);
      }

      return receivedText;
    };

  // ==========================================================
  // GENERATE SECURE FIX
  // ==========================================================

  const generateSecureFix =
    async () => {

      if (!code?.trim()) {

        setFixError(
          "Please enter or upload source code first."
        );

        return;
      }

      // ------------------------------------------------------
      // CANCEL PREVIOUS REQUEST
      // ------------------------------------------------------

      if (
        fixAbortControllerRef.current
      ) {

        try {
          fixAbortControllerRef.current.abort();
        } catch (error) {
          console.warn(
            "Previous AI fix abort failed:",
            error
          );
        }
      }

      const controller =
        new AbortController();

      fixAbortControllerRef.current =
        controller;

      try {

        setFixLoading(true);
        setFixError("");
        setFixedCode("");

        const token =
          getAuthToken();

        const baseUrl =
          getApiBaseUrl();

        const endpoint =
          `${baseUrl}/ai/fix`;

        console.log(
          "========================================"
        );

        console.log(
          "AI SECURE FIX STREAM REQUEST"
        );

        console.log(
          "Endpoint:",
          endpoint
        );

        console.log(
          "Language:",
          language
        );

        console.log(
          "Code Length:",
          code.length
        );

        console.log(
          "========================================"
        );

        // ----------------------------------------------------
        // DIRECT FETCH
        // ----------------------------------------------------

        const response =
          await fetch(
            endpoint,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/x-ndjson, application/json, text/plain, text/event-stream",

                ...(token
                  ? {
                      Authorization:
                        "Bearer " + token,
                    }
                  : {}),
              },

              body: JSON.stringify({
                code,
                language,
              }),

              signal:
                controller.signal,

              cache: "no-store",
            }
          );

        console.log(
          "AI Fix HTTP Status:",
          response.status
        );

        // ----------------------------------------------------
        // HTTP ERROR
        // ----------------------------------------------------

        if (!response.ok) {

          let errorMessage =
            "Failed to generate secure fix.";

          try {

            const contentType =
              response.headers.get(
                "content-type"
              ) || "";

            if (
              contentType.includes(
                "application/json"
              )
            ) {

              const errorData =
                await response.json();

              errorMessage =
                extractErrorMessage(
                  errorData,
                  errorMessage
                );

            } else {

              const errorText =
                await response.text();

              if (
                errorText
              ) {

                try {

                  const parsed =
                    JSON.parse(
                      errorText
                    );

                  errorMessage =
                    extractErrorMessage(
                      parsed,
                      errorMessage
                    );

                } catch {
                  errorMessage =
                    errorText;
                }
              }
            }

          } catch (error) {

            console.warn(
              "Unable to parse AI fix error:",
              error
            );
          }

          throw new Error(
            errorMessage
          );
        }

        // ----------------------------------------------------
        // CONTENT TYPE
        // ----------------------------------------------------

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        // ----------------------------------------------------
        // NORMAL JSON FALLBACK
        //
        // This keeps compatibility with the existing backend.
        // Once Flask /ai/fix becomes streaming, the stream path
        // below will automatically be used.
        // ----------------------------------------------------

        if (
          contentType.includes(
            "application/json"
          ) &&
          !contentType.includes(
            "ndjson"
          )
        ) {

          const data =
            await response.json();

          if (
            data?.success === false
          ) {

            throw new Error(
              data?.message ||
              data?.error ||
              "Failed to generate secure fix."
            );
          }

          const fix =
            data?.fix ||
            data?.secureFix ||
            data?.secure_fix ||
            data?.response ||
            data?.result?.fix ||
            data?.data?.fix ||
            data?.message ||
            "";

          if (!fix) {

            throw new Error(
              "AI did not return a secure fix."
            );
          }

          setFixedCode(
            String(fix)
          );

          console.log(
            "AI Fix JSON Response Completed"
          );

          return;
        }

        // ----------------------------------------------------
        // STREAM RESPONSE
        // ----------------------------------------------------

        const finalFix =
          await processSecureFixStream(
            response,
            controller
          );

        // ----------------------------------------------------
        // FINAL VALIDATION
        // ----------------------------------------------------

        if (
          !finalFix?.trim()
        ) {

          throw new Error(
            "AI did not return a secure fix."
          );
        }

        console.log(
          "AI Fix Stream Completed"
        );

        console.log(
          "Response Length:",
          finalFix.length
        );

      } catch (err) {

        // ----------------------------------------------------
        // ABORT HANDLING
        // ----------------------------------------------------

        if (
          err?.name ===
          "AbortError"
        ) {

          console.log(
            "AI Fix request aborted."
          );

          return;
        }

        console.error(
          "AI Fix Error:",
          err
        );

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to generate secure fix.";

        setFixError(
          message
        );

      } finally {

        if (
          fixAbortControllerRef.current ===
          controller
        ) {

          fixAbortControllerRef.current =
            null;
        }

        setFixLoading(
          false
        );
      }
    };

  // ==========================================================
  // COPY FIXED CODE
  // ==========================================================

  const handleCopyFixedCode =
    async () => {

      if (!fixedCode) {
        return;
      }

      try {

        await navigator.clipboard.writeText(
          fixedCode
        );

      } catch (err) {

        console.error(
          "Copy Error:",
          err
        );

        setFixError(
          "Failed to copy the fixed code."
        );
      }
    };

  // ==========================================================
  // SELECT VULNERABILITY
  // ==========================================================

  const handleVulnerabilitySelect =
    (vulnerability) => {

      if (!vulnerability) {
        return;
      }

      setSelectedVulnerability(
        vulnerability
      );

      setVulnerabilityDialogOpen(
        true
      );
    };

  // ==========================================================
  // CLOSE DIALOG
  // ==========================================================

  const handleCloseVulnerabilityDialog =
    () => {

      setVulnerabilityDialogOpen(
        false
      );

      setSelectedVulnerability(
        null
      );
    };

  // ==========================================================
  // ASK AI
  // ==========================================================

  const handleAskAI = (
    vulnerability = null
  ) => {

    if (!scanResult) {

      setError(
        "Please scan the source code before asking AI."
      );

      return;
    }

    const vulnerabilityToSend =
      vulnerability ||
      selectedVulnerability ||
      null;

    const fileName =
      selectedFile?.name ||
      "Source Code";

    const chatScanContext =
      createScanContext({

        scanResult,

        code,

        language,

        fileName,

        selectedVulnerability:
          vulnerabilityToSend,
      });

    saveScanContext(
      chatScanContext
    );

    let initialQuestion =
      "Analyze my complete security scan results. " +
      "Explain all detected vulnerabilities, " +
      "their severity, affected lines, security impact, " +
      "possible risks, and recommended secure fixes.";

    if (
      vulnerabilityToSend
    ) {

      const normalized =
        vulnerabilityToSend;

      const type =
        normalized?.type ||
        normalized?.name ||
        normalized?.title ||
        normalized?.vulnerability ||
        "Security Vulnerability";

      const severity =
        normalized?.severity ||
        normalized?.level ||
        "Unknown";

      const line =
        normalized?.line ??
        normalized?.lineNumber ??
        normalized?.line_number ??
        normalized?.startLine ??
        normalized?.start_line ??
        normalized?.location?.line ??
        "Unknown";

      const problem =
        normalized?.problem ||
        normalized?.description ||
        normalized?.issue ||
        normalized?.message ||
        "Security issue detected.";

      initialQuestion =
        `Analyze the ${type} vulnerability ` +
        `detected around line ${line}. ` +
        `Severity: ${severity}. ` +
        `Problem: ${problem}. ` +
        "Explain why this is a security risk, " +
        "its impact, and provide a secure fix.";
    }

    navigate(
      "/chatbot",
      {
        state: {

          scanContext:
            chatScanContext,

          selectedVulnerability:
            vulnerabilityToSend,

          vulnerability:
            vulnerabilityToSend,

          vulnerabilityContext:
            vulnerabilityToSend,

          sourceCode:
            code,

          language,

          initialQuestion,
        },
      }
    );
  };

  // ==========================================================
  // RESET
  // ==========================================================

  const handleReset = () => {

    if (
      fixAbortControllerRef.current
    ) {

      try {
        fixAbortControllerRef.current.abort();
      } catch (error) {
        console.warn(
          "Reset abort error:",
          error
        );
      }

      fixAbortControllerRef.current =
        null;
    }

    setLanguage("python");

    setCode(
      DEFAULT_CODE.python
    );

    setSelectedFile(null);
    setScanResult(null);
    setLoading(false);
    setError("");
    setFixedCode("");
    setFixLoading(false);
    setFixError("");
    setSelectedVulnerability(null);
    setVulnerabilityDialogOpen(false);
  };

  // ==========================================================
  // GET VULNERABILITIES
  // ==========================================================

  const rawVulnerabilities =
    Array.isArray(
      scanResult?.vulnerabilities
    )
      ? scanResult.vulnerabilities
      : Array.isArray(
          scanResult?.issues
        )
        ? scanResult.issues
        : Array.isArray(
            scanResult?.results
          )
          ? scanResult.results
          : [];

  const vulnerabilityCount =
    scanResult?.totalIssues ??
    scanResult?.total_issues ??
    scanResult?.issueCount ??
    rawVulnerabilities.length;

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (

    <Layout>

      <Box
        sx={{
          maxWidth: 1400,
          mx: "auto",
          pb: 5,
        }}
      >

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <Box sx={{ mb: 4 }}>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1 }}
          >

            <SecurityIcon
              sx={{
                color: "#00E5FF",
                fontSize: 32,
              }}
            />

            <Typography
              variant="h4"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              AI Security Scanner
            </Typography>

          </Stack>

          <Typography
            sx={{
              color: "#9CA3AF",
              ml: 0.5,
            }}
          >
            Scan your source code for potential
            security vulnerabilities.
          </Typography>

        </Box>

        {/* ==================================================
            MAIN GRID
        ================================================== */}

        <Grid
          container
          spacing={3}
        >

          {/* ==================================================
              EDITOR
          ================================================== */}

          <Grid
            item
            xs={12}
            lg={8}
          >

            <Paper
              elevation={6}
              sx={{
                bgcolor: "#111827",
                p: 3,
                borderRadius: 4,
                overflow: "hidden",
                border:
                  "1px solid rgba(255,255,255,0.05)",
              }}
            >

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{
                  xs: "stretch",
                  sm: "center",
                }}
                sx={{ mb: 3 }}
              >

                <Typography
                  variant="h6"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  Source Code
                </Typography>

                <Chip
                  icon={<SecurityIcon />}
                  label={
                    loading
                      ? "Scanning..."
                      : fixLoading
                        ? "Generating AI Fix..."
                        : "Ready to Scan"
                  }
                  color={
                    loading ||
                    fixLoading
                      ? "warning"
                      : "primary"
                  }
                />

              </Stack>

              {/* LANGUAGE */}

              <FormControl
                fullWidth
                sx={{ mb: 3 }}
              >

                <InputLabel>
                  Language
                </InputLabel>

                <Select
                  value={language}
                  label="Language"
                  onChange={
                    handleLanguageChange
                  }
                >

                  {LANGUAGE_OPTIONS.map(
                    (item) => (

                      <MenuItem
                        key={item}
                        value={item}
                      >

                        {
                          item
                            .charAt(0)
                            .toUpperCase() +
                          item.slice(1)
                        }

                      </MenuItem>

                    )
                  )}

                </Select>

              </FormControl>

              {/* CODE EDITOR */}

              <Box
                sx={{
                  height: 500,
                }}
              >

                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  theme="vs-dark"

                  onChange={(value) =>
                    setCode(
                      value || ""
                    )
                  }

                  options={{
                    minimap: {
                      enabled: false,
                    },

                    fontSize: 14,

                    wordWrap: "on",

                    automaticLayout: true,

                    scrollBeyondLastLine:
                      false,

                    padding: {
                      top: 16,
                    },
                  }}
                />

              </Box>

              {/* ACTION BUTTONS */}

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={2}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 3 }}
              >

                <Button
                  component="label"
                  variant="outlined"
                  startIcon={
                    <UploadFileIcon />
                  }
                  disabled={
                    loading ||
                    fixLoading
                  }
                  sx={{
                    color: "#fff",
                    borderColor:
                      "rgba(255,255,255,0.3)",
                  }}
                >

                  Upload File

                  <input
                    hidden
                    type="file"
                    accept=".py,.js,.php,.java,.txt"
                    onChange={
                      handleFileUpload
                    }
                  />

                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    <RestartAltIcon />
                  }
                  onClick={
                    handleReset
                  }
                  disabled={
                    loading ||
                    fixLoading
                  }
                  sx={{
                    color: "#fff",
                    borderColor:
                      "rgba(255,255,255,0.3)",
                  }}
                >
                  Reset
                </Button>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={
                    loading
                      ? (
                        <CircularProgress
                          size={20}
                          color="inherit"
                        />
                      )
                      : (
                        <SecurityIcon />
                      )
                  }
                  onClick={
                    handleScan
                  }
                  disabled={
                    loading ||
                    fixLoading ||
                    !code.trim()
                  }
                  sx={{
                    bgcolor: "#00B8D4",
                    color: "#000",
                    fontWeight: 700,

                    "&:hover": {
                      bgcolor: "#00E5FF",
                    },
                  }}
                >
                  {
                    loading
                      ? "Scanning..."
                      : "Scan Code"
                  }
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={
                    fixLoading
                      ? (
                        <CircularProgress
                          size={20}
                          color="inherit"
                        />
                      )
                      : (
                        <AutoFixHighIcon />
                      )
                  }
                  onClick={
                    generateSecureFix
                  }
                  disabled={
                    loading ||
                    fixLoading ||
                    !code.trim()
                  }
                >
                  {
                    fixLoading
                      ? "Generating..."
                      : "Generate Secure Fix"
                  }
                </Button>

              </Stack>

              {selectedFile && (

                <Typography
                  sx={{
                    mt: 2,
                    color: "#aaa",
                  }}
                >
                  Uploaded:{" "}
                  {selectedFile.name}
                </Typography>

              )}

            </Paper>

          </Grid>

          {/* ==================================================
              INFORMATION PANEL
          ================================================== */}

          <Grid
            item
            xs={12}
            lg={4}
          >

            <Paper
              sx={{
                bgcolor: "#111a2e",
                p: 3,
                borderRadius: 3,
                height: "100%",
              }}
            >

              <Typography
                variant="h6"
                sx={{
                  color: "#fff",
                  mb: 2,
                  fontWeight: 700,
                }}
              >
                Scanner Information
              </Typography>

              <Typography
                sx={{
                  color: "#ccc",
                  mb: 2,
                }}
              >
                Supported Languages:
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
              >

                <Chip label="Python" />
                <Chip label="JavaScript" />
                <Chip label="PHP" />
                <Chip label="Java" />

              </Stack>

              <Typography
                sx={{
                  color: "#ccc",
                  mt: 4,
                  lineHeight: 1.8,
                }}
              >
                Upload source code or paste code
                directly into the editor and click
                Scan Code to perform security analysis.
              </Typography>

              <Box
                sx={{
                  mt: 4,
                  p: 2,
                  bgcolor: "#1d263b",
                  borderRadius: 2,
                }}
              >

                <Typography
                  sx={{
                    color: "#00E5FF",
                  }}
                >
                  ✔ SQL Injection Detection
                </Typography>

                <Typography
                  sx={{
                    color: "#00E5FF",
                    mt: 1,
                  }}
                >
                  ✔ Hardcoded Secrets Detection
                </Typography>

                <Typography
                  sx={{
                    color: "#00E5FF",
                    mt: 1,
                  }}
                >
                  ✔ AI Fix Suggestions
                </Typography>

              </Box>

            </Paper>

          </Grid>

        </Grid>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <Alert
            severity="error"
            onClose={() =>
              setError("")
            }
            sx={{
              mt: 3,
            }}
          >
            {error}
          </Alert>

        )}

        {/* ==================================================
            SCAN SUMMARY
        ================================================== */}

        {scanResult && (

          <Box
            sx={{
              mt: 3,
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >

            <Chip
              label={
                "Language: " +
                language
              }
              variant="outlined"
              sx={{
                color: "#00E5FF",
                borderColor: "#00E5FF",
              }}
            />

            <Chip
              label={
                "Issues Found: " +
                vulnerabilityCount
              }
              color={
                vulnerabilityCount > 0
                  ? "warning"
                  : "success"
              }
            />

            {scanResult.status && (

              <Chip
                label={
                  "Status: " +
                  scanResult.status
                }
              />

            )}

            <Chip
              icon={<SpeedIcon />}
              label={
                "Risk Score: " +
                (
                  scanResult.riskScore ??
                  scanResult.risk_score ??
                  0
                )
              }
              sx={{
                color: "#FFB300",
                border:
                  "1px solid rgba(255,179,0,0.4)",
                bgcolor:
                  "rgba(255,179,0,0.08)",
                fontWeight: 700,
              }}
            />

            <Button
              variant="contained"
              startIcon={
                <SmartToyIcon />
              }
              onClick={() =>
                handleAskAI(null)
              }
              sx={{
                bgcolor: "#7C3AED",
                fontWeight: 700,

                "&:hover": {
                  bgcolor: "#6D28D9",
                },
              }}
            >
              Ask AI About This Scan
            </Button>

          </Box>

        )}

        {/* ==================================================
            SCAN RESULTS
        ================================================== */}

        {scanResult && (

          <ScanResults
            scanResult={scanResult}
            language={language}
            onVulnerabilitySelect={
              handleVulnerabilitySelect
            }
            onAskAI={
              handleAskAI
            }
          />

        )}

        {/* ==================================================
            AI FIX ERROR
        ================================================== */}

        {fixError && (

          <Alert
            severity="error"
            onClose={() =>
              setFixError("")
            }
            sx={{ mt: 3 }}
          >
            {fixError}
          </Alert>

        )}

        {/* ==================================================
            FIXED CODE
        ================================================== */}

        {(fixedCode || fixLoading) && (

          <Paper
            sx={{
              bgcolor: "#111a2e",
              p: 3,
              borderRadius: 3,
              mt: 4,
            }}
          >

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{
                xs: "stretch",
                sm: "center",
              }}
              sx={{ mb: 2 }}
            >

              <Box>

                <Typography
                  variant="h6"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  AI Generated Secure Fix
                </Typography>

                {fixLoading && (

                  <Typography
                    sx={{
                      color: "#00E5FF",
                      fontSize: 13,
                      mt: 0.5,
                    }}
                  >
                    AI is generating the secure fix...
                  </Typography>

                )}

              </Box>

              <Button
                variant="outlined"
                onClick={
                  handleCopyFixedCode
                }
                disabled={
                  !fixedCode ||
                  fixLoading
                }
                sx={{
                  color: "#fff",
                  borderColor:
                    "rgba(255,255,255,0.3)",
                }}
              >
                Copy Fixed Code
              </Button>

            </Stack>

            <Box
              sx={{
                height: 500,
                position: "relative",
              }}
            >

              <Editor
                height="100%"
                language={language}
                value={fixedCode}
                theme="vs-dark"

                options={{
                  readOnly: true,

                  minimap: {
                    enabled: false,
                  },

                  fontSize: 14,

                  wordWrap: "on",

                  automaticLayout: true,

                  scrollBeyondLastLine:
                    false,

                  padding: {
                    top: 16,
                  },
                }}
              />

              {fixLoading && !fixedCode && (

                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor:
                      "rgba(17,24,39,0.65)",
                    pointerEvents: "none",
                  }}
                >

                  <Stack
                    spacing={1.5}
                    alignItems="center"
                  >

                    <CircularProgress
                      size={32}
                      sx={{
                        color: "#00E5FF",
                      }}
                    />

                    <Typography
                      sx={{
                        color: "#fff",
                        fontSize: 14,
                      }}
                    >
                      AI is generating secure code...
                    </Typography>

                  </Stack>

                </Box>

              )}

            </Box>

          </Paper>

        )}

        {/* ==================================================
            VULNERABILITY DIALOG
        ================================================== */}

        <VulnerabilityDetailsDialog
          open={
            vulnerabilityDialogOpen
          }

          vulnerability={
            selectedVulnerability
          }

          language={language}

          code={code}

          onClose={
            handleCloseVulnerabilityDialog
          }
        />

      </Box>

    </Layout>
  );
};

export default Scanner;