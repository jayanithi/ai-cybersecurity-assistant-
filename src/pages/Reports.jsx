import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import SecurityIcon from "@mui/icons-material/Security";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import Layout from "../components/Layout";
import API from "../services/api";

import ReportsTable from "../components/reports/ReportsTable";
import ReportDetailsDialog from "../components/reports/ReportDetailsDialog";
import ReportsPagination from "../components/reports/ReportsPagination";

// ============================================================
// REPORTS PAGE
// ============================================================

const Reports = () => {
  // ==========================================================
  // REPORT DATA
  // ==========================================================

  const [reports, setReports] = useState([]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  // ==========================================================
  // PAGE STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // FILTER STATE
  // ==========================================================

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [grade, setGrade] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [severity, setSeverity] = useState("");
  const [scanDate, setScanDate] = useState("");

  // ==========================================================
  // REPORT DETAILS
  // ==========================================================

  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ==========================================================
  // AUTH CONFIG
  // ==========================================================

  const getAuthConfig = useCallback(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (!token) {
      return {};
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, []);

  // ==========================================================
  // GET REPORT ID
  // ==========================================================

  const getReportId = useCallback((report) => {
    if (!report) {
      return null;
    }

    const id =
      report.id ??
      report._id ??
      report.reportId ??
      report.report_id ??
      report.scan_id ??
      report.scanId ??
      null;

    if (
      id &&
      typeof id === "object" &&
      id.$oid
    ) {
      return String(id.$oid);
    }

    if (
      id === null ||
      id === undefined
    ) {
      return null;
    }

    return String(id);
  }, []);

  // ==========================================================
  // RISK LEVEL
  // ==========================================================

  const getRiskLevel = useCallback((riskScore) => {
    const score = Number(riskScore);

    if (Number.isNaN(score)) {
      return "Low";
    }

    if (score >= 90) {
      return "Critical";
    }

    if (score >= 70) {
      return "High";
    }

    if (score >= 40) {
      return "Medium";
    }

    return "Low";
  }, []);

  // ==========================================================
  // SECURITY GRADE
  // ==========================================================

  const getGrade = useCallback((report) => {
    if (!report) {
      return "F";
    }

    if (
      report.grade !== undefined &&
      report.grade !== null &&
      report.grade !== ""
    ) {
      return String(
        report.grade
      ).toUpperCase();
    }

    if (
      report.securityGrade !== undefined &&
      report.securityGrade !== null &&
      report.securityGrade !== ""
    ) {
      return String(
        report.securityGrade
      ).toUpperCase();
    }

    const nested =
      report.scan_result ||
      report.scanResult ||
      report.scan_results ||
      report.scanResults ||
      {};

    if (
      nested.grade !== undefined &&
      nested.grade !== null &&
      nested.grade !== ""
    ) {
      return String(
        nested.grade
      ).toUpperCase();
    }

    if (
      nested.securityGrade !== undefined &&
      nested.securityGrade !== null &&
      nested.securityGrade !== ""
    ) {
      return String(
        nested.securityGrade
      ).toUpperCase();
    }

    const score = Number(
      report.riskScore ??
        report.risk_score ??
        nested.riskScore ??
        nested.risk_score
    );

    if (Number.isNaN(score)) {
      return "F";
    }

    if (score <= 20) {
      return "A";
    }

    if (score <= 40) {
      return "B";
    }

    if (score <= 60) {
      return "C";
    }

    if (score <= 80) {
      return "D";
    }

    return "F";
  }, []);

  // ==========================================================
  // GET REPORT DATE
  // ==========================================================

  const getReportDate = useCallback((report) => {
    if (!report) {
      return null;
    }

    const nested =
      report.scan_result ||
      report.scanResult ||
      report.scan_results ||
      report.scanResults ||
      {};

    const metadata =
      report.metadata ||
      report.scanMetadata ||
      report.scan_metadata ||
      nested.metadata ||
      nested.scanMetadata ||
      nested.scan_metadata ||
      {};

    return (
      report.scanDate ??
      report.scan_date ??
      report.scanTime ??
      report.scan_time ??
      report.scannedAt ??
      report.scanned_at ??
      report.createdAt ??
      report.created_at ??
      report.timestamp ??
      report.date ??
      metadata.scanDate ??
      metadata.scan_date ??
      metadata.scanTime ??
      metadata.scan_time ??
      metadata.scannedAt ??
      metadata.scanned_at ??
      metadata.createdAt ??
      metadata.created_at ??
      metadata.timestamp ??
      metadata.date ??
      nested.scanDate ??
      nested.scan_date ??
      nested.scanTime ??
      nested.scan_time ??
      nested.scannedAt ??
      nested.scanned_at ??
      nested.createdAt ??
      nested.created_at ??
      nested.timestamp ??
      nested.date ??
      null
    );
  }, []);

  // ==========================================================
  // DATE ONLY
  // ==========================================================

  const getDateOnly = useCallback((value) => {
    if (!value) {
      return "";
    }

    // --------------------------------------------------------
    // MongoDB Extended JSON
    // Example:
    // { "$date": "2026-09-27T10:30:00.000Z" }
    // --------------------------------------------------------

    if (
      typeof value === "object" &&
      value.$date
    ) {
      value = value.$date;
    }

    // --------------------------------------------------------
    // Date object
    // --------------------------------------------------------

    if (
      value instanceof Date
    ) {
      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return "";
      }

      const year =
        value.getFullYear();

      const month =
        String(
          value.getMonth() + 1
        ).padStart(2, "0");

      const day =
        String(
          value.getDate()
        ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    const stringValue =
      String(value).trim();

    if (!stringValue) {
      return "";
    }

    // --------------------------------------------------------
    // Already YYYY-MM-DD
    // --------------------------------------------------------

    const isoDateMatch =
      stringValue.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (isoDateMatch) {
      return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    }

    // --------------------------------------------------------
    // DD/MM/YYYY
    // --------------------------------------------------------

    const slashDateMatch =
      stringValue.match(
        /^(\d{2})\/(\d{2})\/(\d{4})/
      );

    if (slashDateMatch) {
      return `${slashDateMatch[3]}-${slashDateMatch[2]}-${slashDateMatch[1]}`;
    }

    // --------------------------------------------------------
    // DD-MM-YYYY
    // --------------------------------------------------------

    const dashDateMatch =
      stringValue.match(
        /^(\d{2})-(\d{2})-(\d{4})/
      );

    if (dashDateMatch) {
      return `${dashDateMatch[3]}-${dashDateMatch[2]}-${dashDateMatch[1]}`;
    }

    // --------------------------------------------------------
    // Generic JavaScript Date parsing
    // --------------------------------------------------------

    try {
      const date =
        new Date(stringValue);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      // IMPORTANT:
      // getFullYear/getMonth/getDate use
      // browser local timezone.
      const year =
        date.getFullYear();

      const month =
        String(
          date.getMonth() + 1
        ).padStart(2, "0");

      const day =
        String(
          date.getDate()
        ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  }, []);

  // ==========================================================
  // CONVERT VALUE TO ARRAY
  // ==========================================================

  const toArray = useCallback((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return Object.values(value);
    }

    return [];
  }, []);

  // ==========================================================
  // GET VULNERABILITIES
  // ==========================================================

  const getVulnerabilities = useCallback(
    (report) => {
      if (!report) {
        return [];
      }

      const nested =
        report.scan_result ||
        report.scanResult ||
        report.scan_results ||
        report.scanResults ||
        {};

      const nestedData =
        report.data ||
        nested.data ||
        {};

      const candidates = [
        report.vulnerabilities,
        report.findings,
        report.issues,
        report.results,

        report.scanResults,
        report.scan_results,

        nested.vulnerabilities,
        nested.findings,
        nested.issues,
        nested.results,

        nestedData.vulnerabilities,
        nestedData.findings,
        nestedData.issues,
        nestedData.results,
      ];

      for (
        const candidate of candidates
      ) {
        const array =
          toArray(candidate);

        if (
          array.length > 0
        ) {
          return array;
        }
      }

      return [];
    },
    [toArray]
  );

  // ==========================================================
  // NORMALIZE SEVERITY
  // ==========================================================

  const normalizeSeverity =
    useCallback((value) => {
      if (
        value === undefined ||
        value === null
      ) {
        return "";
      }

      const normalized =
        String(value)
          .trim()
          .toLowerCase();

      if (
        normalized === "critical"
      ) {
        return "critical";
      }

      if (
        normalized === "high"
      ) {
        return "high";
      }

      if (
        normalized === "medium" ||
        normalized === "moderate"
      ) {
        return "medium";
      }

      if (
        normalized === "low"
      ) {
        return "low";
      }

      if (
        normalized === "info" ||
        normalized === "informational"
      ) {
        return "info";
      }

      return normalized;
    }, []);

  // ==========================================================
  // GET SEVERITY FROM VULNERABILITY
  // ==========================================================

  const getVulnerabilitySeverity =
    useCallback(
      (item) => {
        if (!item) {
          return "";
        }

        return normalizeSeverity(
          item.severity ??
            item.Severity ??
            item.severity_level ??
            item.severityLevel ??
            item.level ??
            item.risk
        );
      },
      [normalizeSeverity]
    );

  // ==========================================================
  // GET SEVERITY COUNTS
  // ==========================================================

  const getSeverityCounts =
    useCallback(
      (report) => {
        if (!report) {
          return {};
        }

        const nested =
          report.scan_result ||
          report.scanResult ||
          report.scan_results ||
          report.scanResults ||
          {};

        const candidates = [
          report.severityCounts,
          report.severity_counts,
          report.severityCount,
          report.severity_count,

          nested.severityCounts,
          nested.severity_counts,
          nested.severityCount,
          nested.severity_count,
        ];

        let source = null;

        for (
          const candidate of candidates
        ) {
          if (
            candidate &&
            typeof candidate === "object" &&
            !Array.isArray(candidate)
          ) {
            source = candidate;
            break;
          }
        }

        if (!source) {
          return {};
        }

        const result = {};

        Object.entries(
          source
        ).forEach(
          ([key, value]) => {
            const normalized =
              normalizeSeverity(key);

            const count =
              Number(value);

            if (
              normalized &&
              Number.isFinite(count) &&
              count > 0
            ) {
              result[normalized] =
                count;
            }
          }
        );

        return result;
      },
      [normalizeSeverity]
    );

  // ==========================================================
  // GET SEVERITIES
  // ==========================================================

  const getSeverities =
    useCallback(
      (report) => {
        const vulnerabilities =
          getVulnerabilities(
            report
          );

        const severities =
          vulnerabilities
            .map(
              getVulnerabilitySeverity
            )
            .filter(Boolean);

        if (
          severities.length > 0
        ) {
          return [
            ...new Set(
              severities
            ),
          ];
        }

        // ------------------------------------------------------
        // Fallback to severity count object
        // ------------------------------------------------------

        const severityCounts =
          getSeverityCounts(
            report
          );

        const countSeverities =
          Object.entries(
            severityCounts
          )
            .filter(
              ([, count]) =>
                Number(count) > 0
            )
            .map(
              ([key]) => key
            );

        if (
          countSeverities.length > 0
        ) {
          return [
            ...new Set(
              countSeverities
            ),
          ];
        }

        // ------------------------------------------------------
        // Last fallback:
        // report-level severity ONLY.
        //
        // We intentionally DO NOT use riskLevel here.
        // Risk Level and vulnerability Severity are different.
        // ------------------------------------------------------

        const reportSeverity =
          normalizeSeverity(
            report.severity ??
              report.severity_level ??
              report.severityLevel
          );

        if (
          reportSeverity
        ) {
          return [
            reportSeverity,
          ];
        }

        return [];
      },
      [
        getVulnerabilities,
        getVulnerabilitySeverity,
        getSeverityCounts,
        normalizeSeverity,
      ]
    );

  // ==========================================================
  // NORMALIZE REPORT
  // ==========================================================

  const normalizeReport =
    useCallback(
      (report) => {
        if (!report) {
          return null;
        }

        const nested =
          report.scan_result ||
          report.scanResult ||
          report.scan_results ||
          report.scanResults ||
          {};

        const vulnerabilities =
          getVulnerabilities(
            report
          );

        const reportId =
          getReportId(
            report
          );

        // ------------------------------------------------------
        // Risk Score
        // ------------------------------------------------------

        const rawRiskScore =
          report.riskScore ??
          report.risk_score ??
          nested.riskScore ??
          nested.risk_score ??
          0;

        const riskScore =
          Number(rawRiskScore) || 0;

        // ------------------------------------------------------
        // Grade
        // ------------------------------------------------------

        const calculatedGrade =
          getGrade({
            ...report,
            ...nested,
            riskScore,
          });

        // ------------------------------------------------------
        // Risk Level
        // ------------------------------------------------------

        const calculatedRiskLevel =
          getRiskLevel(
            riskScore
          );

        // ------------------------------------------------------
        // Total Issues
        // ------------------------------------------------------

        const possibleTotalIssues =
          report.totalIssues ??
          report.total_issues ??
          report.totalVulnerabilities ??
          report.total_vulnerabilities ??
          nested.totalIssues ??
          nested.total_issues ??
          nested.totalVulnerabilities ??
          nested.total_vulnerabilities;

        let totalIssues;

        if (
          possibleTotalIssues !==
            undefined &&
          possibleTotalIssues !==
            null &&
          possibleTotalIssues !== ""
        ) {
          totalIssues =
            Number(
              possibleTotalIssues
            ) || 0;
        } else {
          totalIssues =
            vulnerabilities.length;
        }

        // ------------------------------------------------------
        // Status
        // ------------------------------------------------------

        const normalizedStatus =
          report.status ||
          nested.status ||
          (
            totalIssues > 0
              ? "Unsafe"
              : "Safe"
          );

        // ------------------------------------------------------
        // Confidence
        // ------------------------------------------------------

        const confidence =
          report.confidence ??
          nested.confidence ??
          null;

        // ------------------------------------------------------
        // Scan Time
        // ------------------------------------------------------

        const scanTime =
          getReportDate(
            report
          );

        return {
          ...report,

          // ----------------------------------------------------
          // ID
          // ----------------------------------------------------

          id: reportId,

          _id:
            report._id ||
            reportId,

          // ----------------------------------------------------
          // SCAN VALUES
          // ----------------------------------------------------

          riskScore,

          risk_score:
            report.risk_score ??
            riskScore,

          grade:
            calculatedGrade,

          securityGrade:
            report.securityGrade ||
            nested.securityGrade ||
            calculatedGrade,

          riskLevel:
            calculatedRiskLevel,

          status:
            normalizedStatus,

          totalIssues,

          total_issues:
            report.total_issues ??
            totalIssues,

          confidence,

          // ----------------------------------------------------
          // VULNERABILITIES
          // ----------------------------------------------------

          vulnerabilities,

          findings:
            report.findings ||
            nested.findings ||
            vulnerabilities,

          issues:
            report.issues ||
            nested.issues ||
            vulnerabilities,

          // ----------------------------------------------------
          // DATE
          // ----------------------------------------------------

          scanDate:
            report.scanDate ||
            report.scan_date ||
            scanTime,

          scanTime,

          scan_time:
            report.scan_time ||
            scanTime,

          createdAt:
            report.createdAt ||
            scanTime,

          created_at:
            report.created_at ||
            scanTime,

          // ----------------------------------------------------
          // NESTED RESULT
          // ----------------------------------------------------

          scan_result:
            report.scan_result ||
            report.scanResult ||
            nested,
        };
      },
      [
        getVulnerabilities,
        getReportId,
        getGrade,
        getRiskLevel,
        getReportDate,
      ]
    );

  // ==========================================================
  // FETCH REPORTS
  // ==========================================================

  const fetchReports =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          /*
           * Current backend supports maximum 100
           * history records.
           *
           * Frontend pagination is performed on
           * these fetched records.
           */

          const response =
            await API.get(
              "/scanner/history?limit=100",
              getAuthConfig()
            );

          console.log(
            "SCAN HISTORY RESPONSE:",
            response.data
          );

          let reportData = [];

          // ----------------------------------------------------
          // Response format:
          // { success: true, data: [...] }
          // ----------------------------------------------------

          if (
            response.data?.success &&
            Array.isArray(
              response.data?.data
            )
          ) {
            reportData =
              response.data.data;
          }

          // ----------------------------------------------------
          // Response format:
          // { data: [...] }
          // ----------------------------------------------------

          else if (
            Array.isArray(
              response.data?.data
            )
          ) {
            reportData =
              response.data.data;
          }

          // ----------------------------------------------------
          // Response format:
          // [...]
          // ----------------------------------------------------

          else if (
            Array.isArray(
              response.data
            )
          ) {
            reportData =
              response.data;
          }

          // ----------------------------------------------------
          // Response format:
          // { reports: [...] }
          // ----------------------------------------------------

          else if (
            Array.isArray(
              response.data?.reports
            )
          ) {
            reportData =
              response.data.reports;
          }

          const normalizedReports =
            reportData
              .filter(Boolean)
              .map(
                normalizeReport
              )
              .filter(Boolean);

          console.log(
            "NORMALIZED REPORTS:",
            normalizedReports
          );

          setReports(
            normalizedReports
          );

          // Always reset to first page
          setPagination({
            page: 1,
            limit:
              Number(
                pagination.limit
              ) > 0
                ? Number(
                    pagination.limit
                  )
                : 10,
          });
        } catch (err) {
          console.error(
            "Failed to load scan history:",
            err
          );

          const message =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to load scan history.";

          setError(
            message
          );

          setReports([]);

          setPagination({
            page: 1,
            limit: 10,
          });
        } finally {
          setLoading(false);
        }
      },
      [
        getAuthConfig,
        normalizeReport,
        pagination.limit,
      ]
    );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchReports();

    // Only initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // FILTER LOGIC
  // ==========================================================

  const filteredReports =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      const selectedStatus =
        String(status || "")
          .trim()
          .toLowerCase();

      const selectedGrade =
        String(grade || "")
          .trim()
          .toUpperCase();

      const selectedRisk =
        String(riskLevel || "")
          .trim()
          .toLowerCase();

      const selectedSeverity =
        normalizeSeverity(
          severity
        );

      return reports.filter(
        (report) => {
          if (!report) {
            return false;
          }

          // ====================================================
          // SEARCH
          // ====================================================

          let searchMatch = true;

          if (searchValue) {
            const vulnerabilities =
              getVulnerabilities(
                report
              );

            const vulnerabilityText =
              vulnerabilities
                .map(
                  (item) =>
                    [
                      item?.title,
                      item?.name,
                      item?.description,
                      item?.severity,
                      item?.cwe,
                      item?.code,
                      item?.message,
                    ]
                      .filter(Boolean)
                      .join(" ")
                )
                .join(" ");

            const searchableText = [
              report.language,

              report.projectName,
              report.project_name,

              report.fileName,
              report.file_name,

              report.status,

              report.grade,
              report.securityGrade,

              report.riskLevel,

              report.id,
              report._id,

              report.reportId,
              report.report_id,

              report.scanId,
              report.scan_id,

              report.scanDate,
              report.scan_date,

              report.scanTime,
              report.scan_time,

              vulnerabilityText,
            ]
              .filter(
                (value) =>
                  value !==
                    undefined &&
                  value !== null
              )
              .join(" ")
              .toLowerCase();

            searchMatch =
              searchableText.includes(
                searchValue
              );
          }

          // ====================================================
          // STATUS
          // ====================================================

          const reportStatus =
            String(
              report.status || ""
            )
              .trim()
              .toLowerCase();

          const statusMatch =
            !selectedStatus ||
            reportStatus ===
              selectedStatus;

          // ====================================================
          // GRADE
          // ====================================================

          const reportGrade =
            getGrade(
              report
            );

          const gradeMatch =
            !selectedGrade ||
            reportGrade ===
              selectedGrade;

          // ====================================================
          // RISK LEVEL
          // ====================================================

          const reportRisk =
            getRiskLevel(
              report.riskScore
            );

          const riskMatch =
            !selectedRisk ||
            reportRisk
              .toLowerCase() ===
              selectedRisk;

          // ====================================================
          // SEVERITY
          // ====================================================

          const reportSeverities =
            getSeverities(
              report
            );

          /*
           * IMPORTANT:
           *
           * This is an EXCLUSIVE severity filter.
           *
           * Example:
           *
           * Report A:
           *   Critical
           *   High
           *   Medium
           *
           * Selecting Medium:
           *
           * Report A -> HIDDEN
           *
           * Report B:
           *   Medium
           *
           * Selecting Medium:
           *
           * Report B -> SHOWN
           *
           * Therefore we require every severity
           * inside the report to equal the selected
           * severity.
           */

          const severityMatch =
            !selectedSeverity ||
            (
              reportSeverities.length >
                0 &&
              reportSeverities.every(
                (item) =>
                  item ===
                  selectedSeverity
              )
            );

          // ====================================================
          // SCAN DATE
          // ====================================================

          const rawReportDate =
            getReportDate(
              report
            );

          const reportDate =
            getDateOnly(
              rawReportDate
            );

          const dateMatch =
            !scanDate ||
            (
              reportDate !== "" &&
              reportDate ===
                scanDate
            );

          // ====================================================
          // FINAL FILTER
          // ====================================================

          return (
            searchMatch &&
            statusMatch &&
            gradeMatch &&
            riskMatch &&
            severityMatch &&
            dateMatch
          );
        }
      );
    }, [
      reports,
      search,
      status,
      grade,
      riskLevel,
      severity,
      scanDate,
      getGrade,
      getRiskLevel,
      getSeverities,
      getReportDate,
      getDateOnly,
      getVulnerabilities,
      normalizeSeverity,
    ]);

  // ==========================================================
  // PAGINATION DERIVED VALUES
  // ==========================================================

  const totalReports =
    filteredReports.length;

  const totalPages =
    totalReports === 0
      ? 1
      : Math.ceil(
          totalReports /
            Number(
              pagination.limit
            )
        );

  const safePage =
    Math.max(
      1,
      Math.min(
        Number(
          pagination.page
        ) || 1,
        totalPages
      )
    );

  const safeLimit =
    Number(
      pagination.limit
    ) > 0
      ? Number(
          pagination.limit
        )
      : 10;

  // ==========================================================
  // KEEP PAGE VALID
  // ==========================================================

  useEffect(() => {
    if (
      pagination.page !==
      safePage
    ) {
      setPagination(
        (prev) => ({
          ...prev,
          page: safePage,
        })
      );
    }
  }, [
    pagination.page,
    safePage,
  ]);

  // ==========================================================
  // PAGINATED REPORTS
  // ==========================================================

  const paginatedReports =
    useMemo(() => {
      const start =
        (safePage - 1) *
        safeLimit;

      const end =
        start +
        safeLimit;

      return filteredReports.slice(
        start,
        end
      );
    }, [
      filteredReports,
      safePage,
      safeLimit,
    ]);

  // ==========================================================
  // PAGINATION OBJECT
  // ==========================================================

  const paginationData =
    useMemo(() => {
      return {
        page: safePage,

        limit: safeLimit,

        totalReports,

        totalPages,

        hasNextPage:
          safePage <
          totalPages,

        hasPreviousPage:
          safePage > 1,
      };
    }, [
      safePage,
      safeLimit,
      totalReports,
      totalPages,
    ]);

  // ==========================================================
  // ACTIVE FILTER COUNT
  // ==========================================================

  const activeFilterCount =
    useMemo(() => {
      return [
        search,
        status,
        grade,
        riskLevel,
        severity,
        scanDate,
      ].filter(
        (value) =>
          String(
            value || ""
          ).trim()
      ).length;
    }, [
      search,
      status,
      grade,
      riskLevel,
      severity,
      scanDate,
    ]);

  // ==========================================================
  // PAGE CHANGE
  // ==========================================================

  const handlePageChange =
    useCallback(
      (newPage) => {
        const numericPage =
          Number(
            newPage
          );

        if (
          !Number.isFinite(
            numericPage
          )
        ) {
          return;
        }

        const safeNewPage =
          Math.max(
            1,
            Math.min(
              numericPage,
              totalPages
            )
          );

        setPagination(
          (prev) => ({
            ...prev,
            page:
              safeNewPage,
          })
        );

        window.scrollTo({
          top: 0,
          behavior:
            "smooth",
        });
      },
      [totalPages]
    );

  // ==========================================================
  // LIMIT CHANGE
  // ==========================================================

  const handleLimitChange =
    useCallback(
      (newLimit) => {
        const numericLimit =
          Number(
            newLimit
          );

        const allowedLimits = [
          5,
          10,
          20,
          50,
        ];

        if (
          !allowedLimits.includes(
            numericLimit
          )
        ) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * Whenever limit changes:
         *
         * 10 -> 20
         * 20 -> 50
         * 50 -> 10
         *
         * always return to page 1.
         */

        setPagination({
          page: 1,
          limit:
            numericLimit,
        });

        window.scrollTo({
          top: 0,
          behavior:
            "smooth",
        });
      },
      []
    );

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  const handleReset =
    useCallback(() => {
      setSearch("");
      setStatus("");
      setGrade("");
      setRiskLevel("");
      setSeverity("");
      setScanDate("");

      setPagination(
        (prev) => ({
          ...prev,
          page: 1,
        })
      );
    }, []);

  // ==========================================================
  // VIEW REPORT
  // ==========================================================

  const handleView =
    useCallback(
      (report) => {
        if (!report) {
          return;
        }

        setSelectedReport(
          report
        );

        setDialogOpen(
          true
        );
      },
      []
    );

  // ==========================================================
  // CLOSE DIALOG
  // ==========================================================

  const handleCloseDialog =
    useCallback(() => {
      setDialogOpen(
        false
      );

      setSelectedReport(
        null
      );
    }, []);

  // ==========================================================
  // DELETE REPORT
  // ==========================================================

  const handleDelete =
    useCallback(
      async (reportOrId) => {
        const id =
          typeof reportOrId ===
          "object"
            ? getReportId(
                reportOrId
              )
            : reportOrId;

        if (!id) {
          setError(
            "Report ID is missing."
          );

          return;
        }

        const confirmed =
          window.confirm(
            "Are you sure you want to delete this scan history?"
          );

        if (!confirmed) {
          return;
        }

        try {
          setError("");

          await API.delete(
            `/scanner/history/${encodeURIComponent(
              String(id)
            )}`,
            getAuthConfig()
          );

          setReports(
            (prev) =>
              prev.filter(
                (report) =>
                  String(
                    getReportId(
                      report
                    )
                  ) !==
                  String(id)
              )
          );

          if (
            selectedReport &&
            String(
              getReportId(
                selectedReport
              )
            ) ===
              String(id)
          ) {
            handleCloseDialog();
          }

          /*
           * If deleting the last item on the
           * current page, safePage effect will
           * automatically move to previous page.
           */
        } catch (err) {
          console.error(
            "Delete Report Error:",
            err
          );

          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Failed to delete report."
          );
        }
      },
      [
        getAuthConfig,
        getReportId,
        selectedReport,
        handleCloseDialog,
      ]
    );

  // ==========================================================
  // INDIVIDUAL PDF DOWNLOAD
  // ==========================================================

  const handleDownload =
    useCallback(
      async (report) => {
        const reportId =
          getReportId(
            report
          );

        if (!reportId) {
          setError(
            "Report ID is missing."
          );

          return;
        }

        try {
          setError("");

          const response =
            await API.get(
              `/reports/download/${encodeURIComponent(
                String(reportId)
              )}`,
              {
                ...getAuthConfig(),

                responseType:
                  "blob",
              }
            );

          const contentType =
            response.headers?.[
              "content-type"
            ] || "";

          // --------------------------------------------------
          // JSON error returned as blob
          // --------------------------------------------------

          if (
            contentType.includes(
              "application/json"
            )
          ) {
            const text =
              await response.data.text();

            let message =
              "Failed to download report.";

            try {
              const parsed =
                JSON.parse(
                  text
                );

              message =
                parsed.message ||
                parsed.error ||
                message;
            } catch {
              // Keep default
            }

            throw new Error(
              message
            );
          }

          const blob =
            new Blob(
              [response.data],
              {
                type:
                  "application/pdf",
              }
            );

          const url =
            window.URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              "a"
            );

          link.href =
            url;

          link.download =
            `Security_Report_${reportId}.pdf`;

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          window.URL.revokeObjectURL(
            url
          );
        } catch (err) {
          console.error(
            "PDF Download Error:",
            err
          );

          setError(
            err.message ||
              err.response?.data?.message ||
              err.response?.data?.error ||
              "Failed to download report. Check the backend report download API."
          );
        }
      },
      [
        getAuthConfig,
        getReportId,
      ]
    );

  // ==========================================================
  // EXPORT CSV
  // ==========================================================

  const handleExportCSV =
    useCallback(
      async () => {
        try {
          setError("");

          const response =
            await API.get(
              "/reports/export/csv",
              {
                ...getAuthConfig(),

                responseType:
                  "blob",
              }
            );

          const contentType =
            response.headers?.[
              "content-type"
            ] || "";

          // --------------------------------------------------
          // Detect JSON error
          // --------------------------------------------------

          if (
            contentType.includes(
              "application/json"
            )
          ) {
            const text =
              await response.data.text();

            let message =
              "Failed to export CSV report.";

            try {
              const parsed =
                JSON.parse(
                  text
                );

              message =
                parsed.message ||
                parsed.error ||
                message;
            } catch {
              // Keep default
            }

            throw new Error(
              message
            );
          }

          const blob =
            new Blob(
              [response.data],
              {
                type:
                  "text/csv;charset=utf-8;",
              }
            );

          const url =
            window.URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              "a"
            );

          link.href =
            url;

          link.download =
            "Security_Scan_Reports.csv";

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          window.URL.revokeObjectURL(
            url
          );
        } catch (err) {
          console.error(
            "CSV Export Error:",
            err
          );

          setError(
            err.message ||
              err.response?.data?.message ||
              err.response?.data?.error ||
              "Failed to export CSV report."
          );
        }
      },
      [
        getAuthConfig,
      ]
    );

  // ==========================================================
  // EXPORT PDF
  // ==========================================================

  const handleExportPDF =
    useCallback(
      async () => {
        try {
          setError("");

          const response =
            await API.get(
              "/reports/export/pdf",
              {
                ...getAuthConfig(),

                responseType:
                  "blob",
              }
            );

          const contentType =
            response.headers?.[
              "content-type"
            ] || "";

          // --------------------------------------------------
          // Detect JSON error
          // --------------------------------------------------

          if (
            contentType.includes(
              "application/json"
            )
          ) {
            const text =
              await response.data.text();

            let message =
              "Failed to export PDF report.";

            try {
              const parsed =
                JSON.parse(
                  text
                );

              message =
                parsed.message ||
                parsed.error ||
                message;
            } catch {
              // Keep default
            }

            throw new Error(
              message
            );
          }

          const blob =
            new Blob(
              [response.data],
              {
                type:
                  "application/pdf",
              }
            );

          const url =
            window.URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              "a"
            );

          link.href =
            url;

          link.download =
            "Security_Scan_Reports.pdf";

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          window.URL.revokeObjectURL(
            url
          );
        } catch (err) {
          console.error(
            "PDF Export Error:",
            err
          );

          setError(
            err.message ||
              err.response?.data?.message ||
              err.response?.data?.error ||
              "Failed to export PDF report."
          );
        }
      },
      [
        getAuthConfig,
      ]
    );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    useCallback(
      async () => {
        await fetchReports();

        setPagination(
          (prev) => ({
            ...prev,
            page: 1,
          })
        );
      },
      [
        fetchReports,
      ]
    );

  // ==========================================================
  // COMMON FILTER HANDLER
  // ==========================================================

  const resetToFirstPage =
    useCallback(() => {
      setPagination(
        (prev) => ({
          ...prev,
          page: 1,
        })
      );
    }, []);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    reports.length === 0
  ) {
    return (
      <Layout>
        <Box
          sx={{
            minHeight:
              "70vh",

            display:
              "flex",

            justifyContent:
              "center",

            alignItems:
              "center",

            flexDirection:
              "column",

            gap: 2,
          }}
        >
          <CircularProgress
            size={45}
          />

          <Typography
            sx={{
              color:
                "#aaa",
            }}
          >
            Loading reports...
          </Typography>
        </Box>
      </Layout>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <Layout>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <Box
        sx={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          mb: 3,

          gap: 2,

          flexWrap:
            "wrap",
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              color:
                "#fff",

              fontWeight:
                700,
            }}
          >
            Security Scan Reports
          </Typography>

          <Typography
            sx={{
              color:
                "#94a3b8",

              mt: 0.5,
            }}
          >
            Review and manage your
            security scan results
          </Typography>
        </Box>

        {/* ==================================================
            HEADER BUTTONS
        ================================================== */}

        <Box
          sx={{
            display:
              "flex",

            alignItems:
              "center",

            gap: 1.5,

            flexWrap:
              "wrap",
          }}
        >
          {/* CSV */}

          <Button
            variant="outlined"
            startIcon={
              <DownloadIcon />
            }
            onClick={
              handleExportCSV
            }
            disabled={
              loading ||
              reports.length ===
                0
            }
            sx={{
              color:
                "#22c55e",

              borderColor:
                "rgba(34,197,94,0.45)",

              borderRadius:
                2,

              px: 2,

              "&:hover": {
                borderColor:
                  "#22c55e",

                bgcolor:
                  "rgba(34,197,94,0.08)",
              },
            }}
          >
            Export CSV
          </Button>

          {/* PDF */}

          <Button
            variant="outlined"
            startIcon={
              <DownloadIcon />
            }
            onClick={
              handleExportPDF
            }
            disabled={
              loading ||
              reports.length ===
                0
            }
            sx={{
              color:
                "#f87171",

              borderColor:
                "rgba(248,113,113,0.45)",

              borderRadius:
                2,

              px: 2,

              "&:hover": {
                borderColor:
                  "#f87171",

                bgcolor:
                  "rgba(248,113,113,0.08)",
              },
            }}
          >
            Export PDF
          </Button>

          {/* REFRESH */}

          <Button
            variant="outlined"
            startIcon={
              <RefreshIcon />
            }
            onClick={
              handleRefresh
            }
            disabled={
              loading
            }
            sx={{
              color:
                "#00E5FF",

              borderColor:
                "rgba(0,229,255,0.45)",

              borderRadius:
                2,

              px: 2,

              "&:hover": {
                borderColor:
                  "#00E5FF",

                bgcolor:
                  "rgba(0,229,255,0.08)",
              },
            }}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </Button>
        </Box>
      </Box>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <Alert
          severity="error"
          onClose={() =>
            setError("")
          }
          sx={{
            mb: 3,
          }}
        >
          {error}
        </Alert>
      )}

      {/* ======================================================
          FILTER PANEL
      ====================================================== */}

      <Paper
        elevation={5}
        sx={{
          bgcolor:
            "#111827",

          border:
            "1px solid rgba(255,255,255,0.08)",

          borderRadius:
            3,

          p: {
            xs: 2,
            md: 2.5,
          },

          mb: 3,
        }}
      >
        {/* FILTER HEADER */}

        <Box
          sx={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap: 2,

            flexWrap:
              "wrap",

            mb: 2,
          }}
        >
          <Box
            sx={{
              display:
                "flex",

              alignItems:
                "center",

              gap: 1,
            }}
          >
            <FilterAltIcon
              sx={{
                color:
                  "#00E5FF",
              }}
            />

            <Typography
              sx={{
                color:
                  "#fff",

                fontSize:
                  "1.05rem",

                fontWeight:
                  700,
              }}
            >
              Report Filters
            </Typography>

            {activeFilterCount >
              0 && (
              <Chip
                label={`${activeFilterCount} active`}
                size="small"
                sx={{
                  bgcolor:
                    "rgba(0,229,255,0.12)",

                  color:
                    "#00E5FF",

                  border:
                    "1px solid rgba(0,229,255,0.25)",

                  fontWeight:
                    600,
                }}
              />
            )}
          </Box>

          <Button
            size="small"
            onClick={
              handleReset
            }
            disabled={
              activeFilterCount ===
              0
            }
            startIcon={
              <ClearIcon />
            }
            sx={{
              color:
                activeFilterCount
                  ? "#ff6b6b"
                  : "#64748b",

              textTransform:
                "none",

              fontWeight:
                600,

              "&:hover": {
                bgcolor:
                  "rgba(255,107,107,0.08)",
              },
            }}
          >
            Clear Filters
          </Button>
        </Box>

        <Divider
          sx={{
            borderColor:
              "rgba(255,255,255,0.08)",

            mb: 2.5,
          }}
        />

        {/* FILTER GRID */}

        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              {
                xs: "1fr",
                sm: "1fr 1fr",
                md:
                  "2fr 1fr 1fr 1fr 1fr 1fr",
              },

            gap: 1.5,
          }}
        >
          {/* SEARCH */}

          <TextField
            fullWidth
            size="small"
            label="Search"
            placeholder="Search reports..."
            value={
              search
            }
            onChange={(e) => {
              setSearch(
                e.target.value
              );

              resetToFirstPage();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      color:
                        "#64748b",
                    }}
                  />
                </InputAdornment>
              ),

              endAdornment:
                search && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearch(
                          ""
                        );

                        resetToFirstPage();
                      }}
                    >
                      <ClearIcon
                        fontSize="small"
                        sx={{
                          color:
                            "#94a3b8",
                        }}
                      />
                    </IconButton>
                  </InputAdornment>
                ),
            }}
            sx={{
              "& .MuiInputLabel-root":
                {
                  color:
                    "#94a3b8",
                },

              "& .MuiInputLabel-root.Mui-focused":
                {
                  color:
                    "#00E5FF",
                },

              "& .MuiOutlinedInput-root":
                {
                  color:
                    "#fff",

                  bgcolor:
                    "#0b1220",

                  borderRadius:
                    2,

                  "& fieldset":
                    {
                      borderColor:
                        "rgba(255,255,255,0.12)",
                    },

                  "&:hover fieldset":
                    {
                      borderColor:
                        "rgba(0,229,255,0.45)",
                    },

                  "&.Mui-focused fieldset":
                    {
                      borderColor:
                        "#00E5FF",
                    },
                },
            }}
          />

          {/* STATUS */}

          <TextField
            select
            fullWidth
            size="small"
            label="Status"
            value={
              status
            }
            onChange={(e) => {
              setStatus(
                e.target.value
              );

              resetToFirstPage();
            }}
            sx={{
              "& .MuiInputLabel-root":
                {
                  color:
                    "#94a3b8",
                },

              "& .MuiInputLabel-root.Mui-focused":
                {
                  color:
                    "#00E5FF",
                },

              "& .MuiOutlinedInput-root":
                {
                  color:
                    "#fff",

                  bgcolor:
                    "#0b1220",

                  borderRadius:
                    2,

                  "& fieldset":
                    {
                      borderColor:
                        "rgba(255,255,255,0.12)",
                    },

                  "&:hover fieldset":
                    {
                      borderColor:
                        "rgba(0,229,255,0.45)",
                    },

                  "&.Mui-focused fieldset":
                    {
                      borderColor:
                        "#00E5FF",
                    },
                },

              "& .MuiSvgIcon-root":
                {
                  color:
                    "#94a3b8",
                },
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

          {/* SECURITY GRADE */}

          <TextField
            select
            fullWidth
            size="small"
            label="Security Grade"
            value={
              grade
            }
            onChange={(e) => {
              setGrade(
                e.target.value
              );

              resetToFirstPage();
            }}
            sx={{
              "& .MuiInputLabel-root":
                {
                  color:
                    "#94a3b8",
                },

              "& .MuiInputLabel-root.Mui-focused":
                {
                  color:
                    "#00E5FF",
                },

              "& .MuiOutlinedInput-root":
                {
                  color:
                    "#fff",

                  bgcolor:
                    "#0b1220",

                  borderRadius:
                    2,

                  "& fieldset":
                    {
                      borderColor:
                        "rgba(255,255,255,0.12)",
                    },

                  "&:hover fieldset":
                    {
                      borderColor:
                        "rgba(0,229,255,0.45)",
                    },

                  "&.Mui-focused fieldset":
                    {
                      borderColor:
                        "#00E5FF",
                    },
                },

              "& .MuiSvgIcon-root":
                {
                  color:
                    "#94a3b8",
                },
            }}
          >
            <MenuItem value="">
              All Grades
            </MenuItem>

            <MenuItem value="A">
              A
            </MenuItem>

            <MenuItem value="B">
              B
            </MenuItem>

            <MenuItem value="C">
              C
            </MenuItem>

            <MenuItem value="D">
              D
            </MenuItem>

            <MenuItem value="F">
              F
            </MenuItem>
          </TextField>

          {/* RISK LEVEL */}

          <TextField
            select
            fullWidth
            size="small"
            label="Risk Level"
            value={
              riskLevel
            }
            onChange={(e) => {
              setRiskLevel(
                e.target.value
              );

              resetToFirstPage();
            }}
            sx={{
              "& .MuiInputLabel-root":
                {
                  color:
                    "#94a3b8",
                },

              "& .MuiInputLabel-root.Mui-focused":
                {
                  color:
                    "#00E5FF",
                },

              "& .MuiOutlinedInput-root":
                {
                  color:
                    "#fff",

                  bgcolor:
                    "#0b1220",

                  borderRadius:
                    2,

                  "& fieldset":
                    {
                      borderColor:
                        "rgba(255,255,255,0.12)",
                    },

                  "&:hover fieldset":
                    {
                      borderColor:
                        "rgba(0,229,255,0.45)",
                    },

                  "&.Mui-focused fieldset":
                    {
                      borderColor:
                        "#00E5FF",
                    },
                },

              "& .MuiSvgIcon-root":
                {
                  color:
                    "#94a3b8",
                },
            }}
          >
            <MenuItem value="">
              All Risk Levels
            </MenuItem>

            <MenuItem value="Critical">
              Critical
            </MenuItem>

            <MenuItem value="High">
              High
            </MenuItem>

            <MenuItem value="Medium">
              Medium
            </MenuItem>

            <MenuItem value="Low">
              Low
            </MenuItem>
          </TextField>

          {/* SEVERITY */}

          <TextField
            select
            fullWidth
            size="small"
            label="Severity"
            value={
              severity
            }
            onChange={(e) => {
              setSeverity(
                e.target.value
              );

              resetToFirstPage();
            }}
            sx={{
              "& .MuiInputLabel-root":
                {
                  color:
                    "#94a3b8",
                },

              "& .MuiInputLabel-root.Mui-focused":
                {
                  color:
                    "#00E5FF",
                },

              "& .MuiOutlinedInput-root":
                {
                  color:
                    "#fff",

                  bgcolor:
                    "#0b1220",

                  borderRadius:
                    2,

                  "& fieldset":
                    {
                      borderColor:
                        "rgba(255,255,255,0.12)",
                    },

                  "&:hover fieldset":
                    {
                      borderColor:
                        "rgba(0,229,255,0.45)",
                    },

                  "&.Mui-focused fieldset":
                    {
                      borderColor:
                        "#00E5FF",
                    },
                },

              "& .MuiSvgIcon-root":
                {
                  color:
                    "#94a3b8",
                },
            }}
          >
            <MenuItem value="">
              All Severities
            </MenuItem>

            <MenuItem value="Critical">
              Critical
            </MenuItem>

            <MenuItem value="High">
              High
            </MenuItem>

            <MenuItem value="Medium">
              Medium
            </MenuItem>

            <MenuItem value="Low">
              Low
            </MenuItem>

            <MenuItem value="Info">
              Info
            </MenuItem>
          </TextField>

          {/* SCAN DATE */}

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Scan Date"
            value={
              scanDate
            }
            onChange={(e) => {
              setScanDate(
                e.target.value
              );

              resetToFirstPage();
            }}
            InputLabelProps={{
              shrink:
                true,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonthIcon
                    sx={{
                      color:
                        "#64748b",
                    }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiInputLabel-root":
                {
                  color:
                    "#94a3b8",
                },

              "& .MuiInputLabel-root.Mui-focused":
                {
                  color:
                    "#00E5FF",
                },

              "& .MuiOutlinedInput-root":
                {
                  color:
                    "#fff",

                  bgcolor:
                    "#0b1220",

                  borderRadius:
                    2,

                  "& fieldset":
                    {
                      borderColor:
                        "rgba(255,255,255,0.12)",
                    },

                  "&:hover fieldset":
                    {
                      borderColor:
                        "rgba(0,229,255,0.45)",
                    },

                  "&.Mui-focused fieldset":
                    {
                      borderColor:
                        "#00E5FF",
                    },
                },

              "& input::-webkit-calendar-picker-indicator":
                {
                  filter:
                    "invert(1)",

                  opacity:
                    0.7,

                  cursor:
                    "pointer",
                },
            }}
          />
        </Box>

        {/* ACTIVE FILTER SUMMARY */}

        {activeFilterCount >
          0 && (
          <Box
            sx={{
              display:
                "flex",

              alignItems:
                "center",

              gap: 1,

              flexWrap:
                "wrap",

              mt: 2,
            }}
          >
            <Typography
              sx={{
                color:
                  "#64748b",

                fontSize:
                  "0.82rem",
              }}
            >
              Active:
            </Typography>

            {search && (
              <Chip
                size="small"
                label={`Search: ${search}`}
                onDelete={() => {
                  setSearch(
                    ""
                  );

                  resetToFirstPage();
                }}
                sx={{
                  bgcolor:
                    "rgba(0,229,255,0.08)",

                  color:
                    "#00E5FF",

                  border:
                    "1px solid rgba(0,229,255,0.2)",
                }}
              />
            )}

            {status && (
              <Chip
                size="small"
                label={`Status: ${status}`}
                onDelete={() => {
                  setStatus(
                    ""
                  );

                  resetToFirstPage();
                }}
                sx={{
                  bgcolor:
                    "rgba(255,255,255,0.05)",

                  color:
                    "#e2e8f0",
                }}
              />
            )}

            {grade && (
              <Chip
                size="small"
                label={`Grade: ${grade}`}
                onDelete={() => {
                  setGrade(
                    ""
                  );

                  resetToFirstPage();
                }}
                sx={{
                  bgcolor:
                    "rgba(255,255,255,0.05)",

                  color:
                    "#e2e8f0",
                }}
              />
            )}

            {riskLevel && (
              <Chip
                size="small"
                label={`Risk: ${riskLevel}`}
                onDelete={() => {
                  setRiskLevel(
                    ""
                  );

                  resetToFirstPage();
                }}
                sx={{
                  bgcolor:
                    "rgba(255,255,255,0.05)",

                  color:
                    "#e2e8f0",
                }}
              />
            )}

            {severity && (
              <Chip
                size="small"
                label={`Severity: ${severity}`}
                onDelete={() => {
                  setSeverity(
                    ""
                  );

                  resetToFirstPage();
                }}
                sx={{
                  bgcolor:
                    "rgba(255,255,255,0.05)",

                  color:
                    "#e2e8f0",
                }}
              />
            )}

            {scanDate && (
              <Chip
                size="small"
                label={`Date: ${scanDate}`}
                onDelete={() => {
                  setScanDate(
                    ""
                  );

                  resetToFirstPage();
                }}
                sx={{
                  bgcolor:
                    "rgba(255,255,255,0.05)",

                  color:
                    "#e2e8f0",
                }}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* ======================================================
          RESULT INFO
      ====================================================== */}

      <Box
        sx={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          mt: 1,

          mb: 2,

          flexWrap:
            "wrap",

          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              color:
                "#94a3b8",
            }}
          >
            Showing{" "}
            <strong
              style={{
                color:
                  "#fff",
              }}
            >
              {
                paginatedReports.length
              }
            </strong>{" "}
            of{" "}
            <strong
              style={{
                color:
                  "#00E5FF",
              }}
            >
              {
                totalReports
              }
            </strong>{" "}
            reports
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              "flex",

            alignItems:
              "center",

            gap: 1.5,
          }}
        >
          {activeFilterCount >
            0 && (
            <Chip
              icon={
                <FilterAltIcon />
              }
              label={`${totalReports} filtered`}
              size="small"
              sx={{
                bgcolor:
                  "rgba(0,229,255,0.08)",

                color:
                  "#00E5FF",

                "& .MuiChip-icon":
                  {
                    color:
                      "#00E5FF",
                  },
              }}
            />
          )}

          <Typography
            sx={{
              color:
                "#94a3b8",
            }}
          >
            Page{" "}
            <strong
              style={{
                color:
                  "#fff",
              }}
            >
              {
                safePage
              }
            </strong>{" "}
            of{" "}
            <strong
              style={{
                color:
                  "#00E5FF",
              }}
            >
              {
                totalPages
              }
            </strong>
          </Typography>
        </Box>
      </Box>

      {/* ======================================================
          EMPTY DATA
      ====================================================== */}

      {reports.length ===
      0 ? (
        <Paper
          elevation={5}
          sx={{
            bgcolor:
              "#111827",

            borderRadius:
              3,

            border:
              "1px solid rgba(255,255,255,0.08)",

            p: 6,

            textAlign:
              "center",
          }}
        >
          <SecurityIcon
            sx={{
              fontSize:
                50,

              color:
                "#334155",

              mb: 1,
            }}
          />

          <Typography
            variant="h6"
            sx={{
              color:
                "#fff",

              mb: 1,
            }}
          >
            No reports found
          </Typography>

          <Typography
            sx={{
              color:
                "#64748b",
            }}
          >
            There are no security scan
            reports available.
          </Typography>
        </Paper>
      ) : filteredReports.length ===
        0 ? (
        <Paper
          elevation={5}
          sx={{
            bgcolor:
              "#111827",

            borderRadius:
              3,

            border:
              "1px solid rgba(255,255,255,0.08)",

            p: 6,

            textAlign:
              "center",
          }}
        >
          <SearchIcon
            sx={{
              fontSize:
                50,

              color:
                "#334155",

              mb: 1,
            }}
          />

          <Typography
            variant="h6"
            sx={{
              color:
                "#fff",

              mb: 1,
            }}
          >
            No matching reports
          </Typography>

          <Typography
            sx={{
              color:
                "#64748b",

              mb: 2,
            }}
          >
            No reports match the
            selected filters.
          </Typography>

          <Button
            variant="outlined"
            onClick={
              handleReset
            }
            startIcon={
              <ClearIcon />
            }
            sx={{
              color:
                "#00E5FF",

              borderColor:
                "rgba(0,229,255,0.4)",

              "&:hover": {
                borderColor:
                  "#00E5FF",

                bgcolor:
                  "rgba(0,229,255,0.08)",
              },
            }}
          >
            Clear Filters
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={5}
          sx={{
            bgcolor:
              "#111827",

            borderRadius:
              3,

            overflow:
              "hidden",

            border:
              "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ReportsTable
            reports={
              paginatedReports
            }
            onView={
              handleView
            }
            onDelete={
              handleDelete
            }
            onDownload={
              handleDownload
            }
          />
        </Paper>
      )}

      {/* ======================================================
          PAGINATION
      ====================================================== */}

      {totalReports > 0 && (
        <Box
          sx={{
            mt: 2,
          }}
        >
          <ReportsPagination
            pagination={
              paginationData
            }
            onPageChange={
              handlePageChange
            }
            onLimitChange={
              handleLimitChange
            }
          />
        </Box>
      )}

      {/* ======================================================
          DETAILS DIALOG
      ====================================================== */}

      <ReportDetailsDialog
        open={
          dialogOpen
        }
        report={
          selectedReport
        }
        onClose={
          handleCloseDialog
        }
      />
    </Layout>
  );
};

export default Reports;