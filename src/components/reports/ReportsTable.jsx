import React from "react";

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  Box,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";

// ==========================================================
// Grade
// ==========================================================

const getGrade = (riskScore) => {
  const score = Number(riskScore) || 0;

  if (score <= 20) return "A";
  if (score <= 40) return "B";
  if (score <= 60) return "C";
  if (score <= 80) return "D";

  return "F";
};

// ==========================================================
// Grade Color
// ==========================================================

const getGradeColor = (grade) => {
  switch (String(grade || "").toUpperCase()) {
    case "A":
      return "#00C853";

    case "B":
      return "#64DD17";

    case "C":
      return "#FFAB00";

    case "D":
      return "#FF6D00";

    case "F":
      return "#FF1744";

    default:
      return "#aaa";
  }
};

// ==========================================================
// Risk Level
// ==========================================================

const getRiskLevel = (riskScore) => {
  const score = Number(riskScore) || 0;

  if (score >= 90) return "Critical";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";

  return "Low";
};

// ==========================================================
// Risk Color
// ==========================================================

const getRiskColor = (riskLevel) => {
  switch (String(riskLevel || "").toLowerCase()) {
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

// ==========================================================
// Status Color
// ==========================================================

const getStatusColor = (status) => {
  const normalized = String(status || "")
    .toLowerCase()
    .trim();

  if (normalized === "safe") {
    return "success";
  }

  return "error";
};

// ==========================================================
// Normalize Severity
// ==========================================================

const normalizeSeverity = (severity) => {
  if (severity === null || severity === undefined) {
    return "";
  }

  // ------------------------------------------
  // Object severity
  // ------------------------------------------

  if (typeof severity === "object") {
    const possibleValues = [
      severity.severity,
      severity.level,
      severity.name,
      severity.value,
      severity.risk,
      severity.riskLevel,
      severity.risk_level,
    ];

    for (const value of possibleValues) {
      if (
        value !== null &&
        value !== undefined &&
        typeof value !== "object"
      ) {
        const normalized = normalizeSeverity(value);

        if (normalized) {
          return normalized;
        }
      }
    }

    return "";
  }

  // ------------------------------------------
  // String severity
  // ------------------------------------------

  const value = String(severity)
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (
    value === "critical" ||
    value === "crit" ||
    value.includes("critical")
  ) {
    return "Critical";
  }

  if (
    value === "high" ||
    value.includes("high")
  ) {
    return "High";
  }

  if (
    value === "medium" ||
    value === "moderate" ||
    value.includes("medium") ||
    value.includes("moderate")
  ) {
    return "Medium";
  }

  if (
    value === "low" ||
    value.includes("low")
  ) {
    return "Low";
  }

  if (
    value === "info" ||
    value === "informational" ||
    value.includes("informational")
  ) {
    return "Info";
  }

  return "";
};

// ==========================================================
// Get Vulnerability Severity
// ==========================================================

const getVulnerabilitySeverity = (vulnerability) => {
  if (
    !vulnerability ||
    typeof vulnerability !== "object"
  ) {
    return "";
  }

  const possibleValues = [
    vulnerability.severity,
    vulnerability.level,
    vulnerability.riskLevel,
    vulnerability.risk_level,
    vulnerability.risk,

    vulnerability.details?.severity,
    vulnerability.details?.level,
    vulnerability.details?.risk,

    vulnerability.result?.severity,
    vulnerability.result?.level,
    vulnerability.result?.risk,

    vulnerability.metadata?.severity,
    vulnerability.metadata?.level,
    vulnerability.metadata?.risk,
  ];

  for (const value of possibleValues) {
    const normalized = normalizeSeverity(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
};

// ==========================================================
// Check Vulnerability Object
// ==========================================================

const looksLikeVulnerability = (value) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Boolean(
    value.severity ||
      value.level ||
      value.riskLevel ||
      value.risk_level ||
      value.risk ||
      value.title ||
      value.name ||
      value.description ||
      value.message ||
      value.cwe ||
      value.cweId ||
      value.code ||
      value.rule ||
      value.vulnerability
  );
};

// ==========================================================
// Convert Vulnerability Container To Array
// ==========================================================

const toVulnerabilityArray = (value) => {
  if (!value) {
    return [];
  }

  // ------------------------------------------
  // Array
  // ------------------------------------------

  if (Array.isArray(value)) {
    return value.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
    );
  }

  // ------------------------------------------
  // Object
  // ------------------------------------------

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    // Single vulnerability
    if (looksLikeVulnerability(value)) {
      return [value];
    }

    // Object containing vulnerabilities
    return Object.values(value).filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        looksLikeVulnerability(item)
    );
  }

  return [];
};

// ==========================================================
// Get Vulnerabilities
// ==========================================================

const getVulnerabilities = (report) => {
  if (
    !report ||
    typeof report !== "object"
  ) {
    return [];
  }

  const vulnerabilities = [];

  const containers = [
    report,
    report.data,
    report.result,
    report.scanResult,
    report.scan_result,
    report.scanResults,
    report.scan_results,
    report.analysis,
    report.scan,
  ].filter(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item)
  );

  const vulnerabilityKeys = [
    "vulnerabilities",
    "findings",
    "issues",
    "results",
    "securityIssues",
    "security_issues",
    "detectedVulnerabilities",
    "detected_vulnerabilities",
  ];

  for (const container of containers) {
    // ------------------------------------------
    // If container itself is vulnerability
    // ------------------------------------------

    if (looksLikeVulnerability(container)) {
      vulnerabilities.push(container);
    }

    // ------------------------------------------
    // Search known vulnerability keys
    // ------------------------------------------

    for (const key of vulnerabilityKeys) {
      if (
        container[key] !== undefined &&
        container[key] !== null
      ) {
        vulnerabilities.push(
          ...toVulnerabilityArray(
            container[key]
          )
        );
      }
    }
  }

  // ------------------------------------------
  // Remove duplicates
  // ------------------------------------------

  return [...new Set(vulnerabilities)];
};

// ==========================================================
// Get Severity Counts From Report
// ==========================================================

const getSeverityCounts = (report) => {
  const counts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Info: 0,
  };

  if (
    !report ||
    typeof report !== "object"
  ) {
    return counts;
  }

  const possibleContainers = [
    report,
    report.data,
    report.result,
    report.scanResult,
    report.scan_result,
  ].filter(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item)
  );

  const possibleKeys = [
    "severityCounts",
    "severity_counts",
    "severityCount",
    "severity_count",
    "severities",
  ];

  for (const container of possibleContainers) {
    for (const key of possibleKeys) {
      const value = container[key];

      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        continue;
      }

      for (const [severityKey, severityValue] of Object.entries(
        value
      )) {
        const normalized =
          normalizeSeverity(severityKey);

        if (!normalized) {
          continue;
        }

        const numericValue =
          Number(severityValue);

        if (
          Number.isFinite(numericValue) &&
          numericValue > 0
        ) {
          counts[normalized] += numericValue;
        }
      }
    }
  }

  return counts;
};

// ==========================================================
// Get Report Severities
// ==========================================================
//
// IMPORTANT:
// This determines whether the WHOLE REPORT should be visible
// when a severity filter is selected.
//
// Example:
//
// Report:
// Critical = 1
// High = 2
// Medium = 3
//
// Filter = Medium
//
// => Report MUST remain visible
// => Only Medium vulnerabilities count inside it
// ==========================================================

const getReportSeverities = (report) => {
  const severities = new Set();

  // ------------------------------------------
  // 1. Actual vulnerability objects
  // ------------------------------------------

  const vulnerabilities =
    getVulnerabilities(report);

  vulnerabilities.forEach((vulnerability) => {
    const severity =
      getVulnerabilitySeverity(
        vulnerability
      );

    if (severity) {
      severities.add(severity);
    }
  });

  // ------------------------------------------
  // 2. Backend severity counts
  // ------------------------------------------

  const severityCounts =
    getSeverityCounts(report);

  Object.entries(severityCounts).forEach(
    ([severity, count]) => {
      if (Number(count) > 0) {
        severities.add(severity);
      }
    }
  );

  // ------------------------------------------
  // 3. Normalized severityList
  // ------------------------------------------

  if (Array.isArray(report?.severityList)) {
    report.severityList.forEach((severity) => {
      const normalized =
        normalizeSeverity(severity);

      if (normalized) {
        severities.add(normalized);
      }
    });
  }

  // ------------------------------------------
  // 4. Other possible report severity fields
  // ------------------------------------------

  const possibleReportSeverities = [
    report?.severity,
    report?.severityLevel,
    report?.severity_level,
  ];

  possibleReportSeverities.forEach((severity) => {
    const normalized =
      normalizeSeverity(severity);

    if (normalized) {
      severities.add(normalized);
    }
  });

  return [...severities];
};

// ==========================================================
// Check Whether Report Has Selected Severity
// ==========================================================

const reportMatchesSeverity = (
  report,
  severityFilter
) => {
  const normalizedFilter =
    normalizeSeverity(severityFilter);

  // ------------------------------------------
  // ALL
  // ------------------------------------------

  if (
    !normalizedFilter ||
    String(severityFilter || "")
      .toLowerCase()
      .trim() === "all"
  ) {
    return true;
  }

  const reportSeverities =
    getReportSeverities(report);

  return reportSeverities.includes(
    normalizedFilter
  );
};

// ==========================================================
// Get Filtered Vulnerabilities
// ==========================================================

const getFilteredVulnerabilities = (
  report,
  severityFilter
) => {
  const vulnerabilities =
    getVulnerabilities(report);

  const normalizedFilter =
    normalizeSeverity(severityFilter);

  // ------------------------------------------
  // ALL
  // ------------------------------------------

  if (
    !normalizedFilter ||
    String(severityFilter || "")
      .toLowerCase()
      .trim() === "all"
  ) {
    return vulnerabilities;
  }

  // ------------------------------------------
  // Selected severity ONLY
  // ------------------------------------------

  return vulnerabilities.filter(
    (vulnerability) =>
      getVulnerabilitySeverity(
        vulnerability
      ) === normalizedFilter
  );
};

// ==========================================================
// Get Total Issues
// ==========================================================

const getTotalIssues = (
  report,
  severityFilter
) => {
  const normalizedFilter =
    normalizeSeverity(severityFilter);

  const isAll =
    !normalizedFilter ||
    String(severityFilter || "")
      .toLowerCase()
      .trim() === "all";

  // ------------------------------------------
  // Actual vulnerability list
  // ------------------------------------------

  const vulnerabilities =
    getVulnerabilities(report);

  if (vulnerabilities.length > 0) {
    if (isAll) {
      return vulnerabilities.length;
    }

    return getFilteredVulnerabilities(
      report,
      severityFilter
    ).length;
  }

  // ------------------------------------------
  // Backend severity counts
  // ------------------------------------------

  const severityCounts =
    getSeverityCounts(report);

  if (!isAll) {
    return Number(
      severityCounts[normalizedFilter] || 0
    );
  }

  // ------------------------------------------
  // ALL fallback
  // ------------------------------------------

  const backendTotal =
    report.totalIssues ??
    report.total_issues ??
    report.issueCount ??
    report.issue_count ??
    report.issues ??
    0;

  return Number(backendTotal) || 0;
};

// ==========================================================
// Reports Table
// ==========================================================

const ReportsTable = ({
  reports = [],
  severityFilter = "All",
  onView,
  onDelete,
  onDownload,
}) => {
  // ========================================================
  // CRITICAL FIX
  // ========================================================
  //
  // Filter the REPORTS themselves first.
  //
  // Before:
  // Critical click -> all reports remained visible
  //
  // Now:
  // Critical -> only reports containing Critical
  // High     -> only reports containing High
  // Medium   -> only reports containing Medium
  // Low      -> only reports containing Low
  // All      -> every report
  //
  // ========================================================

  const filteredReports = reports.filter(
    (report) =>
      reportMatchesSeverity(
        report,
        severityFilter
      )
  );

  return (
    <TableContainer>
      <Table>

        {/* ==================================================
            HEADER
        ================================================== */}

        <TableHead>
          <TableRow
            sx={{
              bgcolor: "#1d263b",
            }}
          >
            <TableCell
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Language
            </TableCell>

            <TableCell
              align="center"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Risk Score
            </TableCell>

            <TableCell
              align="center"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Risk Level
            </TableCell>

            <TableCell
              align="center"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Security Grade
            </TableCell>

            <TableCell
              align="center"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Status
            </TableCell>

            <TableCell
              align="center"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Vulnerabilities
            </TableCell>

            <TableCell
              align="center"
              sx={{
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>

        {/* ==================================================
            BODY
        ================================================== */}

        <TableBody>

          {filteredReports.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                align="center"
                sx={{
                  color: "#aaa",
                  py: 5,
                }}
              >
                {String(
                  severityFilter || "All"
                )
                  .toLowerCase()
                  .trim() === "all"
                  ? "No reports found"
                  : `No ${normalizeSeverity(
                      severityFilter
                    )} severity reports found`}
              </TableCell>
            </TableRow>
          ) : (
            filteredReports.map(
              (report, index) => {

                const riskScore =
                  Number(
                    report.riskScore ??
                      report.risk_score ??
                      0
                  ) || 0;

                const riskLevel =
                  getRiskLevel(
                    riskScore
                  );

                const grade =
                  report.grade ||
                  report.securityGrade ||
                  report.security_grade ||
                  getGrade(riskScore);

                // ------------------------------------------
                // ONLY selected severity vulnerabilities
                // ------------------------------------------

                const vulnerabilities =
                  getFilteredVulnerabilities(
                    report,
                    severityFilter
                  );

                // ------------------------------------------
                // ONLY selected severity count
                // ------------------------------------------

                const totalIssues =
                  getTotalIssues(
                    report,
                    severityFilter
                  );

                return (
                  <TableRow
                    key={
                      report.id ||
                      report._id ||
                      `report-${index}`
                    }
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor:
                          "rgba(0,229,255,0.04)",
                      },
                    }}
                  >

                    {/* ==================================================
                        LANGUAGE
                    ================================================== */}

                    <TableCell
                      sx={{
                        color: "#fff",
                      }}
                    >
                      {String(
                        report.language ||
                          "Unknown"
                      )
                        .charAt(0)
                        .toUpperCase() +
                        String(
                          report.language ||
                            "Unknown"
                        ).slice(1)}
                    </TableCell>

                    {/* ==================================================
                        RISK SCORE
                    ================================================== */}

                    <TableCell align="center">
                      <Typography
                        sx={{
                          color:
                            riskScore >= 70
                              ? "#FF5252"
                              : riskScore >= 40
                              ? "#FFAB00"
                              : "#00C853",

                          fontWeight: 700,
                        }}
                      >
                        {riskScore}/100
                      </Typography>
                    </TableCell>

                    {/* ==================================================
                        RISK LEVEL
                    ================================================== */}

                    <TableCell align="center">
                      <Chip
                        label={riskLevel}
                        color={getRiskColor(
                          riskLevel
                        )}
                        size="small"
                      />
                    </TableCell>

                    {/* ==================================================
                        SECURITY GRADE
                    ================================================== */}

                    <TableCell align="center">
                      <Box
                        sx={{
                          display:
                            "inline-flex",

                          justifyContent:
                            "center",

                          alignItems:
                            "center",

                          width: 38,
                          height: 38,

                          borderRadius:
                            "50%",

                          color: "#fff",

                          bgcolor:
                            getGradeColor(
                              grade
                            ),

                          fontWeight: 700,

                          fontSize: 17,
                        }}
                      >
                        {grade}
                      </Box>
                    </TableCell>

                    {/* ==================================================
                        STATUS
                    ================================================== */}

                    <TableCell align="center">
                      <Chip
                        label={
                          report.status ||
                          "Unknown"
                        }
                        color={getStatusColor(
                          report.status
                        )}
                        size="small"
                      />
                    </TableCell>

                    {/* ==================================================
                        VULNERABILITIES
                    ================================================== */}

                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          gap: 0.5,
                        }}
                      >

                        <Typography
                          sx={{
                            color:
                              totalIssues > 0
                                ? "#FFAB00"
                                : "#00C853",

                            fontWeight: 600,
                          }}
                        >
                          {totalIssues}
                        </Typography>

                        {/* ------------------------------------------
                            Selected severity indicator
                        ------------------------------------------ */}

                        {String(
                          severityFilter || ""
                        )
                          .toLowerCase()
                          .trim() !== "all" &&
                          vulnerabilities.length >
                            0 && (
                            <Chip
                              label={`${normalizeSeverity(
                                severityFilter
                              )} only`}
                              size="small"
                              sx={{
                                fontSize: 10,
                                height: 20,
                              }}
                            />
                          )}

                      </Box>
                    </TableCell>

                    {/* ==================================================
                        ACTIONS
                    ================================================== */}

                    <TableCell align="center">

                      {/* VIEW */}

                      <Tooltip title="View Report">
                        <IconButton
                          onClick={() =>
                            onView?.(
                              report
                            )
                          }
                          sx={{
                            color:
                              "#00E5FF",
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>

                      {/* DOWNLOAD */}

                      <Tooltip title="Download Report">
                        <IconButton
                          onClick={() =>
                            onDownload?.(
                              report
                            )
                          }
                          sx={{
                            color:
                              "#00C853",
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>

                      {/* DELETE */}

                      <Tooltip title="Delete Report">
                        <IconButton
                          onClick={() =>
                            onDelete?.(
                              report.id ||
                                report._id
                            )
                          }
                          sx={{
                            color:
                              "#FF5252",
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>

                    </TableCell>

                  </TableRow>
                );
              }
            )
          )}

        </TableBody>

      </Table>
    </TableContainer>
  );
};

export default ReportsTable;