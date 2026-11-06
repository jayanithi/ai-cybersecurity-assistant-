import React, { useState } from "react";

import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Divider,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BugReportIcon from "@mui/icons-material/BugReport";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BuildIcon from "@mui/icons-material/Build";
import ChatIcon from "@mui/icons-material/Chat";

import { useNavigate } from "react-router-dom";

import API from "../services/api";

import {
  saveAIChatContext,
} from "../utils/aiChatContext";

import VulnerabilityDetailsDialog from "./vulnerabilities/VulnerabilityDetailsDialog";

// ============================================================
// STORAGE KEYS
// ============================================================

const SCAN_CONTEXT_STORAGE_KEY =
  "latest_scan_context";

const SELECTED_VULNERABILITY_STORAGE_KEY =
  "selected_vulnerability_context";

// ============================================================
// SEVERITY COLOR
// ============================================================

const getSeverityColor = (severity) => {
  const value = String(
    severity || ""
  ).toLowerCase();

  switch (value) {
    case "critical":
      return "error";

    case "high":
      return "error";

    case "medium":
      return "warning";

    case "low":
      return "success";

    default:
      return "default";
  }
};

// ============================================================
// SECURITY GRADE COLOR
// ============================================================

const getGradeColor = (grade) => {
  const value = String(
    grade || ""
  ).toUpperCase();

  switch (value) {
    case "A+":
    case "A":
      return "#00E676";

    case "B":
      return "#00BCD4";

    case "C":
      return "#FFC107";

    case "D":
      return "#FF9800";

    case "F":
      return "#F44336";

    default:
      return "#F44336";
  }
};

// ============================================================
// RISK SCORE COLOR
// ============================================================

const getRiskColor = (score) => {
  const value = Number(score) || 0;

  if (value >= 90) {
    return "#FF1744";
  }

  if (value >= 70) {
    return "#FF5252";
  }

  if (value >= 40) {
    return "#FFC107";
  }

  return "#4CAF50";
};

// ============================================================
// SAFE JSON STORAGE
// ============================================================

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(
      `Failed to save ${key}:`,
      error
    );
  }
};

// ============================================================
// GET CODE SNIPPET AROUND VULNERABILITY LINE
// ============================================================

const getCodeSnippet = (
  sourceCode,
  vulnerabilityLine
) => {
  if (!sourceCode) {
    return "";
  }

  const lineNumber =
    Number(vulnerabilityLine);

  if (
    !Number.isFinite(lineNumber) ||
    lineNumber <= 0
  ) {
    return sourceCode;
  }

  const lines =
    sourceCode.split("\n");

  const startLine =
    Math.max(
      0,
      lineNumber - 3
    );

  const endLine =
    Math.min(
      lines.length,
      lineNumber + 2
    );

  return lines
    .slice(
      startLine,
      endLine
    )
    .map(
      (line, index) => {
        const actualLineNumber =
          startLine +
          index +
          1;

        return `${actualLineNumber}: ${line}`;
      }
    )
    .join("\n");
};

// ============================================================
// SCAN RESULTS COMPONENT
// ============================================================

const ScanResults = ({
  results,
  result,
  scanResult: scanResultProp,
  code,
  language,
  onVulnerabilitySelect,
  onAskAI: onAskAIProp,
}) => {
  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate =
    useNavigate();

  // ==========================================================
  // SUPPORT ALL PROP NAMES
  // ==========================================================

  const scanResult =
    results ||
    result ||
    scanResultProp;

  // ==========================================================
  // STATES
  // ==========================================================

  const [
    selectedVulnerability,
    setSelectedVulnerability,
  ] = useState(null);

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    aiFix,
    setAiFix,
  ] = useState("");

  const [
    fixLoading,
    setFixLoading,
  ] = useState(false);

  const [
    fixError,
    setFixError,
  ] = useState("");

  // ==========================================================
  // EMPTY RESULT
  // ==========================================================

  if (!scanResult) {
    return null;
  }

  // ==========================================================
  // GET VULNERABILITIES
  // ==========================================================

  const vulnerabilities =
    Array.isArray(
      scanResult.vulnerabilities
    )
      ? scanResult.vulnerabilities
      : Array.isArray(
          scanResult.issues
        )
        ? scanResult.issues
        : [];

  // ==========================================================
  // RESULT VALUES
  // ==========================================================

  const riskScore =
    scanResult.riskScore ??
    scanResult.risk_score ??
    0;

  const totalIssues =
    scanResult.totalIssues ??
    scanResult.total_issues ??
    vulnerabilities.length;

  const status =
    scanResult.status ||
    (
      vulnerabilities.length > 0
        ? "Unsafe"
        : "Safe"
    );

  const grade =
    scanResult.grade ||
    scanResult.securityGrade ||
    scanResult.security_grade ||
    "-";

  const confidence =
    scanResult.confidence ??
    scanResult.confidenceScore ??
    scanResult.confidence_score ??
    "-";

  const currentLanguage =
    language ||
    scanResult.language ||
    "Unknown";

  const sourceCode =
    code ||
    scanResult.code ||
    scanResult.sourceCode ||
    "";

  // ==========================================================
  // CREATE COMPLETE SCAN CONTEXT
  // ==========================================================

  const createCompleteScanContext = () => {
    return {
      language:
        currentLanguage,

      code:
        sourceCode,

      sourceCode:
        sourceCode,

      riskScore:
        riskScore,

      totalIssues:
        totalIssues,

      status:
        status,

      grade:
        grade,

      confidence:
        confidence,

      vulnerabilities:
        vulnerabilities,

      createdAt:
        new Date().toISOString(),

      source:
        "scanner",
    };
  };

  // ==========================================================
  // SAVE COMPLETE SCAN CONTEXT
  // ==========================================================

  const saveCompleteScanContext =
    () => {
      const context =
        createCompleteScanContext();

      saveToStorage(
        SCAN_CONTEXT_STORAGE_KEY,
        context
      );

      return context;
    };

  // ==========================================================
  // CREATE SELECTED VULNERABILITY CONTEXT
  // ==========================================================

  const createSelectedVulnerabilityContext =
    (vulnerability) => {
      if (!vulnerability) {
        return null;
      }

      const vulnerabilityName =
        vulnerability.type ||
        vulnerability.name ||
        vulnerability.vulnerability ||
        vulnerability.title ||
        "Unknown Vulnerability";

      const vulnerabilitySeverity =
        vulnerability.severity ||
        "Unknown";

      const vulnerabilityDescription =
        vulnerability.description ||
        "No description available.";

      const vulnerabilityLine =
        vulnerability.line ??
        vulnerability.lineNumber ??
        vulnerability.line_number ??
        "Unknown";

      const vulnerabilityCwe =
        vulnerability.cwe ||
        vulnerability.CWE ||
        "Not specified";

      const vulnerabilitySnippet =
        getCodeSnippet(
          sourceCode,
          vulnerabilityLine
        );

      return {
        // ----------------------------------------------------
        // BASIC DETAILS
        // ----------------------------------------------------

        id:
          vulnerability.id ||
          vulnerability._id ||
          null,

        type:
          vulnerabilityName,

        name:
          vulnerabilityName,

        severity:
          vulnerabilitySeverity,

        description:
          vulnerabilityDescription,

        line:
          vulnerabilityLine,

        lineNumber:
          vulnerabilityLine,

        cwe:
          vulnerabilityCwe,

        // ----------------------------------------------------
        // ORIGINAL OBJECT
        // ----------------------------------------------------

        vulnerability:
          vulnerability,

        // ----------------------------------------------------
        // SOURCE CODE
        // ----------------------------------------------------

        code:
          sourceCode,

        sourceCode:
          sourceCode,

        // ----------------------------------------------------
        // CODE SNIPPET
        // ----------------------------------------------------

        vulnerableCode:
          vulnerabilitySnippet,

        codeSnippet:
          vulnerabilitySnippet,

        affectedCode:
          vulnerabilitySnippet,

        // ----------------------------------------------------
        // SCAN CONTEXT
        // ----------------------------------------------------

        language:
          currentLanguage,

        riskScore:
          riskScore,

        totalIssues:
          totalIssues,

        status:
          status,

        grade:
          grade,

        confidence:
          confidence,

        // ----------------------------------------------------
        // METADATA
        // ----------------------------------------------------

        createdAt:
          new Date().toISOString(),

        source:
          "scanner",
      };
    };

  // ==========================================================
  // VIEW VULNERABILITY DETAILS
  // ==========================================================

  const handleViewDetails = (
    vulnerability
  ) => {
    if (!vulnerability) {
      return;
    }

    setSelectedVulnerability(
      vulnerability
    );

    setFixError("");

    setDialogOpen(true);

    // Also notify parent if provided
    if (
      typeof onVulnerabilitySelect ===
      "function"
    ) {
      onVulnerabilitySelect(
        vulnerability
      );
    }
  };

  // ==========================================================
  // CLOSE DIALOG
  // ==========================================================

  const handleCloseDialog = () => {
    setDialogOpen(false);

    setSelectedVulnerability(
      null
    );
  };

  // ==========================================================
  // ASK AI ABOUT SELECTED VULNERABILITY
  // ==========================================================

  const handleAskAI = (
    vulnerability
  ) => {
    if (!vulnerability) {
      return;
    }

    try {
      // ======================================================
      // SAVE COMPLETE SCAN CONTEXT
      // ======================================================

      const fullScanContext =
        saveCompleteScanContext();

      // ======================================================
      // CREATE VULNERABILITY CONTEXT
      // ======================================================

      const selectedContext =
        createSelectedVulnerabilityContext(
          vulnerability
        );

      if (!selectedContext) {
        return;
      }

      // ======================================================
      // AUTOMATIC QUESTION
      // ======================================================

      const automaticQuestion = `
I want a detailed security analysis of the vulnerability detected in my latest code scan.

Vulnerability Name: ${selectedContext.type}

Severity: ${selectedContext.severity}

CWE: ${selectedContext.cwe}

Affected Line Number: ${selectedContext.line}

Description:
${selectedContext.description}

Programming Language:
${selectedContext.language}

Vulnerable Code Snippet:
${selectedContext.codeSnippet || "Not available"}

Please analyze this SPECIFIC vulnerability only and provide the following:

1. Explain clearly why this vulnerability is dangerous.

2. Explain the security impact of this vulnerability.

3. Explain at a high level how an attacker could abuse this vulnerability.

4. Identify exactly what is wrong with the affected line ${selectedContext.line}.

5. Tell me exactly which code or logic should be changed.

6. Provide the secure replacement code.

7. Clearly explain the difference between the vulnerable code and the fixed code.

8. Give me step-by-step instructions for fixing this issue.

9. Mention secure coding best practices that prevent this vulnerability in the future.

10. Keep the explanation specific to the detected vulnerability and my provided source code. Do not give a generic "Unknown Vulnerability" answer.
      `.trim();

      // ======================================================
      // SAVE AI CHAT CONTEXT
      // ======================================================

      saveAIChatContext({
        language:
          selectedContext.language,

        sourceCode:
          selectedContext.sourceCode,

        code:
          selectedContext.code,

        riskScore:
          riskScore,

        totalIssues:
          totalIssues,

        grade:
          grade,

        status:
          status,

        confidence:
          confidence,

        selectedVulnerability:
          selectedContext,

        vulnerability:
          selectedContext,

        vulnerabilities:
          vulnerabilities,

        scanContext:
          fullScanContext,

        initialQuestion:
          automaticQuestion,

        autoQuestion:
          automaticQuestion,
      });

      // ======================================================
      // SAVE SELECTED VULNERABILITY
      // ======================================================

      saveToStorage(
        SELECTED_VULNERABILITY_STORAGE_KEY,
        selectedContext
      );

      // ======================================================
      // DEBUG
      // ======================================================

      console.log(
        "========================================"
      );

      console.log(
        "ASK AI ABOUT VULNERABILITY"
      );

      console.log(
        "Selected Vulnerability:",
        selectedContext
      );

      console.log(
        "Full Scan Context:",
        fullScanContext
      );

      console.log(
        "Automatic Question:",
        automaticQuestion
      );

      console.log(
        "========================================"
      );

      // ======================================================
      // PARENT HANDLER
      // ======================================================

      if (
        typeof onAskAIProp ===
        "function"
      ) {
        onAskAIProp(
          vulnerability
        );

        return;
      }

      // ======================================================
      // NAVIGATE TO CHATBOT
      // ======================================================

      navigate(
        "/chatbot",
        {
          state: {
            selectedVulnerability:
              selectedContext,

            vulnerability:
              selectedContext,

            scanContext:
              fullScanContext,

            sourceCode:
              selectedContext.sourceCode,

            code:
              selectedContext.code,

            language:
              selectedContext.language,

            initialQuestion:
              automaticQuestion,

            autoQuestion:
              automaticQuestion,

            fromScanner:
              true,

            autoSend:
              true,
          },
        }
      );
    } catch (error) {
      console.error(
        "Failed to prepare AI context:",
        error
      );

      navigate(
        "/chatbot"
      );
    }
  };

  // ==========================================================
  // GENERATE SECURE FIX
  // ==========================================================

  const handleGenerateFix =
    async () => {
      if (!sourceCode.trim()) {
        setFixError(
          "Source code is required to generate a secure fix."
        );

        return;
      }

      if (!currentLanguage) {
        setFixError(
          "Programming language is required."
        );

        return;
      }

      try {
        setFixLoading(true);

        setFixError("");

        setAiFix("");

        const token =
          localStorage.getItem(
            "token"
          ) ||
          localStorage.getItem(
            "accessToken"
          );

        const response =
          await API.post(
            "/ai/fix",
            {
              code: sourceCode,
              language: currentLanguage,
            },
            token
              ? {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              : undefined
          );

        console.log(
          "AI Secure Fix Response:",
          response.data
        );

        if (
          response.data?.success ===
          false
        ) {
          throw new Error(
            response.data?.message ||
            response.data?.error ||
            "Failed to generate secure fix."
          );
        }

        const fix =
          response.data?.fix ||
          response.data?.secureFix ||
          response.data?.secure_fix ||
          response.data?.response ||
          response.data?.message ||
          "";

        if (!fix) {
          throw new Error(
            "AI did not return a secure fix."
          );
        }

        setAiFix(fix);
      } catch (error) {
        console.error(
          "AI Secure Fix Error:",
          error
        );

        setFixError(
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to generate secure fix."
        );
      } finally {
        setFixLoading(false);
      }
    };

  // ==========================================================
  // SAFE PROJECT
  // ==========================================================

  if (
    vulnerabilities.length === 0
  ) {
    return (
      <Paper
        elevation={5}
        sx={{
          mt: 3,
          p: 4,
          borderRadius: 4,
          bgcolor: "#111827",
          textAlign: "center",
        }}
      >
        <CheckCircleIcon
          sx={{
            color: "#4CAF50",
            fontSize: 60,
            mb: 2,
          }}
        />

        <Typography
          variant="h5"
          sx={{
            color: "#4CAF50",
            fontWeight: 700,
            mb: 1,
          }}
        >
          No Vulnerabilities Detected
        </Typography>

        <Typography
          sx={{
            color: "#B0BEC5",
            lineHeight: 1.7,
          }}
        >
          Your scanned code does not contain
          any vulnerabilities detected by the
          current scanner.
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 1,
            flexWrap: "wrap",
            mt: 3,
          }}
        >
          <Chip
            label={`Status: ${status}`}
            color="success"
          />

          <Chip
            label={`Risk Score: ${riskScore}/100`}
            sx={{
              bgcolor:
                getRiskColor(
                  riskScore
                ),
              color: "#fff",
              fontWeight: 700,
            }}
          />

          <Chip
            label={`Grade: ${grade}`}
            sx={{
              color:
                getGradeColor(
                  grade
                ),
              borderColor:
                getGradeColor(
                  grade
                ),
            }}
            variant="outlined"
          />

          <Chip
            label={`Language: ${currentLanguage}`}
            sx={{
              color: "#00E5FF",
              borderColor: "#00E5FF",
            }}
            variant="outlined"
          />
        </Box>
      </Paper>
    );
  }

  // ==========================================================
  // MAIN RESULTS UI
  // ==========================================================

  return (
    <Box
      sx={{
        mt: 3,
      }}
    >
      {/* ======================================================
          SCAN SUMMARY
      ====================================================== */}

      <Paper
        elevation={5}
        sx={{
          bgcolor: "#111a2e",
          p: 3,
          borderRadius: 3,
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Scan Results
            </Typography>

            <Typography
              sx={{
                color: "#aaa",
                mt: 0.5,
              }}
            >
              {totalIssues} security issue
              {totalIssues !== 1
                ? "s"
                : ""}{" "}
              detected
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              label={`Status: ${status}`}
              color={
                String(status)
                  .toLowerCase() ===
                "safe"
                  ? "success"
                  : "error"
              }
            />

            <Chip
              label={`Language: ${currentLanguage}`}
              sx={{
                color: "#00E5FF",
                borderColor:
                  "#00E5FF",
              }}
              variant="outlined"
            />
          </Stack>
        </Box>

        {/* ====================================================
            RESULT CARDS
        ==================================================== */}

        <Grid
          container
          spacing={2}
        >
          {/* RISK SCORE */}

          <Grid
            item
            xs={12}
            sm={6}
            md={2}
          >
            <Box
              sx={{
                bgcolor: "#1d263b",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                height: "100%",
              }}
            >
              <Typography color="#aaa">
                Risk Score
              </Typography>

              <Typography
                variant="h3"
                sx={{
                  color:
                    getRiskColor(
                      riskScore
                    ),
                  fontWeight:
                    "bold",
                }}
              >
                {riskScore}/100
              </Typography>
            </Box>
          </Grid>

          {/* VULNERABILITIES */}

          <Grid
            item
            xs={12}
            sm={6}
            md={2}
          >
            <Box
              sx={{
                bgcolor: "#1d263b",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                height: "100%",
              }}
            >
              <Typography color="#aaa">
                Vulnerabilities
              </Typography>

              <Typography
                variant="h3"
                sx={{
                  color: "#FFAB00",
                  fontWeight:
                    "bold",
                }}
              >
                {totalIssues}
              </Typography>
            </Box>
          </Grid>

          {/* STATUS */}

          <Grid
            item
            xs={12}
            sm={6}
            md={2}
          >
            <Box
              sx={{
                bgcolor: "#1d263b",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                height: "100%",
              }}
            >
              <Typography color="#aaa">
                Status
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  color:
                    String(status)
                      .toLowerCase() ===
                    "safe"
                      ? "#00E676"
                      : "#FF1744",
                  fontWeight:
                    "bold",
                }}
              >
                {status}
              </Typography>
            </Box>
          </Grid>

          {/* GRADE */}

          <Grid
            item
            xs={12}
            sm={6}
            md={2}
          >
            <Box
              sx={{
                bgcolor: "#1d263b",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                height: "100%",
              }}
            >
              <Typography color="#aaa">
                Security Grade
              </Typography>

              <Typography
                variant="h3"
                sx={{
                  color:
                    getGradeColor(
                      grade
                    ),
                  fontWeight:
                    "bold",
                }}
              >
                {grade}
              </Typography>
            </Box>
          </Grid>

          {/* CONFIDENCE */}

          <Grid
            item
            xs={12}
            sm={6}
            md={4}
          >
            <Box
              sx={{
                bgcolor: "#1d263b",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                height: "100%",
              }}
            >
              <Typography color="#aaa">
                Confidence
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  color: "#4CAF50",
                  fontWeight:
                    "bold",
                  mt: 1,
                  wordBreak:
                    "break-word",
                }}
              >
                {typeof confidence ===
                "object"
                  ? JSON.stringify(
                      confidence
                    )
                  : confidence}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ======================================================
          VULNERABILITY TABLE
      ====================================================== */}

      <Paper
        elevation={5}
        sx={{
          bgcolor: "#111a2e",
          p: 3,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
          }}
        >
          <BugReportIcon
            sx={{
              color: "#FF5252",
            }}
          />

          <Typography
            variant="h6"
            sx={{
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Vulnerabilities Found
          </Typography>
        </Box>

        <Divider
          sx={{
            mb: 2,
            borderColor:
              "rgba(255,255,255,0.1)",
          }}
        />

        <TableContainer
          sx={{
            overflowX: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  Severity
                </TableCell>

                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  CWE
                </TableCell>

                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  Description
                </TableCell>

                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  Line
                </TableCell>

                <TableCell
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    minWidth: 250,
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {vulnerabilities.map(
                (
                  vulnerability,
                  index
                ) => {
                  const vulnerabilityName =
                    vulnerability.type ||
                    vulnerability.name ||
                    vulnerability.vulnerability ||
                    vulnerability.title ||
                    "Unknown Vulnerability";

                  const severity =
                    vulnerability.severity ||
                    "Unknown";

                  const description =
                    vulnerability.description ||
                    "No description available.";

                  const line =
                    vulnerability.line ??
                    vulnerability.lineNumber ??
                    vulnerability.line_number ??
                    "Unknown";

                  const cwe =
                    vulnerability.cwe ||
                    vulnerability.CWE ||
                    "Not specified";

                  const key =
                    vulnerability.id ||
                    vulnerability._id ||
                    `${vulnerabilityName}-${index}`;

                  return (
                    <TableRow
                      key={key}
                      sx={{
                        "&:hover": {
                          bgcolor:
                            "rgba(255,255,255,0.03)",
                        },
                      }}
                    >
                      {/* SEVERITY */}

                      <TableCell>
                        <Chip
                          label={severity}
                          color={getSeverityColor(
                            severity
                          )}
                          size="small"
                          sx={{
                            textTransform:
                              "capitalize",
                          }}
                        />
                      </TableCell>

                      {/* CWE */}

                      <TableCell
                        sx={{
                          color: "#fff",
                        }}
                      >
                        {cwe}
                      </TableCell>

                      {/* DESCRIPTION */}

                      <TableCell
                        sx={{
                          color: "#fff",
                          minWidth: 280,
                          maxWidth: 450,
                        }}
                      >
                        <Typography
                          sx={{
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {vulnerabilityName}
                        </Typography>

                        <Typography
                          sx={{
                            color:
                              "#B0BEC5",
                            mt: 0.5,
                            lineHeight: 1.6,
                          }}
                        >
                          {description}
                        </Typography>
                      </TableCell>

                      {/* LINE */}

                      <TableCell
                        sx={{
                          color: "#fff",
                        }}
                      >
                        {line}
                      </TableCell>

                      {/* ACTION */}

                      <TableCell>
                        <Box
                          sx={{
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap: 1,
                          }}
                        >
                          {/* VIEW DETAILS */}

                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                              <VisibilityIcon />
                            }
                            onClick={() =>
                              handleViewDetails(
                                vulnerability
                              )
                            }
                            sx={{
                              color:
                                "#00E5FF",
                              borderColor:
                                "#00E5FF",
                              whiteSpace:
                                "nowrap",

                              "&:hover": {
                                borderColor:
                                  "#00B8D4",
                                bgcolor:
                                  "rgba(0,229,255,0.08)",
                              },
                            }}
                          >
                            View Details
                          </Button>

                          {/* ASK AI */}

                          <Button
                            variant="contained"
                            size="small"
                            startIcon={
                              <ChatIcon />
                            }
                            onClick={() =>
                              handleAskAI(
                                vulnerability
                              )
                            }
                            sx={{
                              bgcolor:
                                "#7C4DFF",
                              color:
                                "#fff",
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",

                              "&:hover": {
                                bgcolor:
                                  "#651FFF",
                              },
                            }}
                          >
                            Ask AI About This
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ====================================================
            AI FIX ERROR
        ==================================================== */}

        {fixError && (
          <Alert
            severity="error"
            sx={{
              mt: 3,
            }}
            onClose={() =>
              setFixError("")
            }
          >
            {fixError}
          </Alert>
        )}

        {/* ====================================================
            GENERATE SECURE FIX
        ==================================================== */}

        <Box
          sx={{
            mt: 4,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            onClick={
              handleGenerateFix
            }
            disabled={
              fixLoading
            }
            startIcon={
              fixLoading ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <BuildIcon />
              )
            }
            sx={{
              bgcolor:
                "#7C4DFF",
              fontWeight: 700,

              "&:hover": {
                bgcolor:
                  "#651FFF",
              },
            }}
          >
            {fixLoading
              ? "Generating..."
              : aiFix
                ? "Generate Again"
                : "Generate Secure Fix"}
          </Button>
        </Box>

        {/* ====================================================
            AI SECURE FIX RESULT
        ==================================================== */}

        {aiFix && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              bgcolor:
                "#1d263b",
              borderRadius: 3,
              border:
                "1px solid rgba(124,77,255,0.35)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems:
                  "center",
                gap: 1,
                mb: 2,
              }}
            >
              <AutoAwesomeIcon
                sx={{
                  color:
                    "#B388FF",
                }}
              />

              <Typography
                variant="h6"
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                AI Secure Fix
              </Typography>
            </Box>

            <Typography
              component="pre"
              sx={{
                color:
                  "#D1D5DB",
                whiteSpace:
                  "pre-wrap",
                fontFamily:
                  "monospace",
                fontSize:
                  "0.9rem",
                lineHeight:
                  1.7,
                overflowX:
                  "auto",
                m: 0,
              }}
            >
              {aiFix}
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* ======================================================
          VULNERABILITY DETAILS DIALOG
      ====================================================== */}

      <VulnerabilityDetailsDialog
        open={dialogOpen}
        vulnerability={
          selectedVulnerability
        }
        language={
          currentLanguage
        }
        code={sourceCode}
        onClose={
          handleCloseDialog
        }
      />
    </Box>
  );
};

export default ScanResults;