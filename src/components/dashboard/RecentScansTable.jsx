import React, { useMemo } from "react";

import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";


// ============================================================
// HELPERS
// ============================================================

const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
};


const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


const calculateGrade = (riskScore) => {
  const score = toNumber(riskScore);

  if (score <= 20) return "A";
  if (score <= 40) return "B";
  if (score <= 60) return "C";
  if (score <= 80) return "D";

  return "F";
};


const normalizeStatus = (status, riskScore, issues) => {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (
    value === "safe" ||
    value === "secure" ||
    value === "passed" ||
    value === "pass"
  ) {
    return "Safe";
  }

  if (
    value === "unsafe" ||
    value === "vulnerable" ||
    value === "failed" ||
    value === "fail"
  ) {
    return "Unsafe";
  }

  return (
    toNumber(riskScore) > 0 ||
    toNumber(issues) > 0
  )
    ? "Unsafe"
    : "Safe";
};


const normalizeLanguage = (value) => {
  const language = String(value || "")
    .trim();

  if (!language) return "Unknown";

  return (
    language.charAt(0).toUpperCase() +
    language.slice(1)
  );
};


const normalizeReport = (report, index) => {
  if (!report || typeof report !== "object") {
    return null;
  }

  // Backend may return a normal report object,
  // a nested scan/result object, or an analytics recent-scan object.
  const source =
    report.scan_result ||
    report.scanResult ||
    report.result ||
    report.data ||
    report;

  const vulnerabilities =
    Array.isArray(
      source?.vulnerabilities
    )
      ? source.vulnerabilities
      : Array.isArray(source?.issues)
        ? source.issues
        : [];

  const riskScore = toNumber(
    firstValue(
      source?.riskScore,
      source?.risk_score,
      source?.score,
      report?.riskScore,
      report?.risk_score,
      report?.score
    ),
    0
  );

  const issueCount = toNumber(
    firstValue(
      source?.totalIssues,
      source?.total_issues,
      source?.issueCount,
      report?.totalIssues,
      report?.total_issues,
      report?.issues,
      vulnerabilities.length
    ),
    vulnerabilities.length
  );

  const grade =
    firstValue(
      source?.grade,
      source?.securityGrade,
      report?.grade,
      report?.securityGrade
    ) ||
    calculateGrade(riskScore);

  const status = normalizeStatus(
    firstValue(
      source?.status,
      report?.status
    ),
    riskScore,
    issueCount
  );

  const id = String(
    firstValue(
      report?._id,
      report?.id,
      report?.reportId,
      report?.report_id,
      source?._id,
      source?.id,
      `scan-${index}`
    )
  );

  return {
    ...report,
    ...source,

    id,
    _id: id,

    language: normalizeLanguage(
      firstValue(
        source?.language,
        source?.programmingLanguage,
        source?.programming_language,
        report?.language,
        report?.programmingLanguage
      )
    ),

    riskScore,

    grade,

    totalIssues: issueCount,
    issues: issueCount,

    status,

    vulnerabilities,

    createdAt: firstValue(
      source?.createdAt,
      source?.created_at,
      source?.timestamp,
      source?.scannedAt,
      source?.scanned_at,
      report?.createdAt,
      report?.created_at,
      report?.timestamp,
      report?.scannedAt,
      report?.scanned_at
    ),

    date: firstValue(
      source?.date,
      report?.date
    ),
  };
};


// ============================================================
// COMPONENT
// ============================================================

const RecentScansTable = ({
  scans,
  onView,
  onDelete,
  onDownload,
}) => {
  const normalizedScans = useMemo(() => {
    let source = scans;

    // Accept both:
    // 1. direct array
    // 2. { reports: [] }
    // 3. { scans: [] }
    // 4. { recentScans: [] }
    // 5. { data: [] }
    if (!Array.isArray(source)) {
      source =
        source?.recentScans ||
        source?.recent_scans ||
        source?.reports ||
        source?.scans ||
        source?.data ||
        [];
    }

    if (!Array.isArray(source)) {
      source = [];
    }

    return source
      .map((item, index) =>
        normalizeReport(item, index)
      )
      .filter(Boolean)
      .slice(0, 10);
  }, [scans]);


  // ==========================================================
  // STATUS CHIP
  // ==========================================================

  const statusChip = (status) => {
    const safe =
      String(status || "")
        .toLowerCase() === "safe";

    return (
      <Chip
        size="small"
        label={safe ? "Safe" : "Unsafe"}
        sx={{
          fontWeight: 700,
          color: safe
            ? "#22c55e"
            : "#ff5252",
          bgcolor: safe
            ? "rgba(34,197,94,0.12)"
            : "rgba(255,82,82,0.12)",
          border: `1px solid ${
            safe
              ? "rgba(34,197,94,0.35)"
              : "rgba(255,82,82,0.35)"
          }`,
        }}
      />
    );
  };


  const gradeChip = (grade) => {
    return (
      <Chip
        size="small"
        label={grade || "N/A"}
        sx={{
          minWidth: 38,
          fontWeight: 800,
          color: "#fff",
          bgcolor: "rgba(255,255,255,0.10)",
          border:
            "1px solid rgba(255,255,255,0.18)",
        }}
      />
    );
  };


  // ==========================================================
  // EMPTY STATE
  // ==========================================================

  if (normalizedScans.length === 0) {
    return (
      <Box
        sx={{
          py: 6,
          textAlign: "center",
          color: "rgba(255,255,255,0.58)",
        }}
      >
        <Typography
          variant="body1"
          sx={{ fontWeight: 500 }}
        >
          No Reports Found
        </Typography>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1,
            color:
              "rgba(255,255,255,0.38)",
          }}
        >
          Completed security scans will appear here.
        </Typography>
      </Box>
    );
  }


  // ==========================================================
  // TABLE
  // ==========================================================

  return (
    <TableContainer
      sx={{
        width: "100%",
        overflowX: "auto",
      }}
    >
      <Table
        sx={{
          minWidth: 820,
          "& .MuiTableCell-root": {
            borderColor:
              "rgba(255,255,255,0.16)",
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                color: "#fff",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              Language
            </TableCell>

            <TableCell
              sx={{
                color: "#fff",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              Risk Score
            </TableCell>

            <TableCell
              sx={{
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Grade
            </TableCell>

            <TableCell
              sx={{
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Issues
            </TableCell>

            <TableCell
              sx={{
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Status
            </TableCell>

            <TableCell
              align="right"
              sx={{
                color: "#fff",
                fontWeight: 800,
              }}
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {normalizedScans.map((scan, index) => (
            <TableRow
              key={
                scan.id ||
                scan._id ||
                `scan-${index}`
              }
              hover
              sx={{
                "&:hover": {
                  bgcolor:
                    "rgba(255,255,255,0.035)",
                },
              }}
            >
              <TableCell
                sx={{
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {scan.language}
              </TableCell>

              <TableCell
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {scan.riskScore}/100
              </TableCell>

              <TableCell>
                {gradeChip(scan.grade)}
              </TableCell>

              <TableCell
                sx={{
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                {scan.totalIssues}
              </TableCell>

              <TableCell>
                {statusChip(scan.status)}
              </TableCell>

              <TableCell align="right">
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 0.5,
                  }}
                >
                  {onView && (
                    <Tooltip title="View report">
                      <IconButton
                        size="small"
                        onClick={() =>
                          onView(scan)
                        }
                        sx={{
                          color: "#90caf9",
                        }}
                      >
                        <VisibilityIcon
                          fontSize="small"
                        />
                      </IconButton>
                    </Tooltip>
                  )}

                  {onDownload && (
                    <Tooltip title="Download PDF">
                      <IconButton
                        size="small"
                        onClick={() =>
                          onDownload(scan)
                        }
                        sx={{
                          color: "#a5d6a7",
                        }}
                      >
                        <DownloadIcon
                          fontSize="small"
                        />
                      </IconButton>
                    </Tooltip>
                  )}

                  {onDelete && (
                    <Tooltip title="Delete report">
                      <IconButton
                        size="small"
                        onClick={() =>
                          onDelete(
                            scan.id ||
                            scan._id
                          )
                        }
                        sx={{
                          color: "#ff8a80",
                        }}
                      >
                        <DeleteOutlineIcon
                          fontSize="small"
                        />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RecentScansTable;
