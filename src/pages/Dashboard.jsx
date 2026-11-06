import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";

import Layout from "../components/Layout";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardCards from "../components/dashboard/DashboardCards";
import SeverityPieChart from "../components/dashboard/SeverityPieChart";
import LanguageBarChart from "../components/dashboard/LanguageBarChart";
import RecentScansTable from "../components/dashboard/RecentScansTable";
import ReportDetailsDialog from "../components/reports/ReportDetailsDialog";
import RiskTrendChart from "../components/dashboard/RiskTrendChart";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";

/* ============================================================
   HELPERS
============================================================ */

const normalizeArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const normalizeReport = (report) => {
  if (!report || typeof report !== "object") {
    return null;
  }

  const id =
    report.id ??
    report._id ??
    report.reportId ??
    report.report_id ??
    report.scanId ??
    report.scan_id ??
    "";

  const vulnerabilities =
    Array.isArray(report.vulnerabilities)
      ? report.vulnerabilities
      : Array.isArray(report.issues)
        ? report.issues
        : [];

  const totalIssues =
    Number(
      report.totalIssues ??
        report.total_issues ??
        report.issuesCount ??
        vulnerabilities.length ??
        0
    ) || 0;

  const riskScore =
    Number(
      report.riskScore ??
        report.risk_score ??
        0
    ) || 0;

  const language =
    report.language ??
    report.programmingLanguage ??
    report.programming_language ??
    "Unknown";

  const status =
    report.status ??
    (riskScore > 0 || totalIssues > 0
      ? "Unsafe"
      : "Safe");

  const grade =
    report.grade ??
    (riskScore <= 20
      ? "A"
      : riskScore <= 40
        ? "B"
        : riskScore <= 60
          ? "C"
          : riskScore <= 80
            ? "D"
            : "F");

  return {
    ...report,

    id: String(id),

    _id: report._id ?? id,

    language: String(language),

    programmingLanguage:
      report.programmingLanguage ??
      language,

    riskScore,

    risk_score:
      report.risk_score ??
      riskScore,

    status,

    grade,

    totalIssues,

    total_issues:
      report.total_issues ??
      totalIssues,

    issues:
      report.issues ??
      totalIssues,

    vulnerabilities,

    createdAt:
      report.createdAt ??
      report.created_at ??
      report.timestamp ??
      report.scannedAt ??
      report.scanTime ??
      null,
  };
};

const extractReports = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  if (Array.isArray(data.reports)) {
    return data.reports;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  if (Array.isArray(data.recentScans)) {
    return data.recentScans;
  }

  return [];
};

const normalizeAnalytics = (data) => {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      totalScans: 0,
      safeScans: 0,
      unsafeScans: 0,
      safeProjects: 0,
      unsafeProjects: 0,
      averageRisk: 0,
      averageRiskScore: 0,
      securityGrade: "A",
      totalVulnerabilities: 0,

      severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },

      languages: {},
      recentScans: [],
      riskTrend: [],
    };
  }

  const severity = {
    critical:
      Number(
        data.severity?.critical ??
          data.critical ??
          0
      ) || 0,

    high:
      Number(
        data.severity?.high ??
          data.high ??
          0
      ) || 0,

    medium:
      Number(
        data.severity?.medium ??
          data.medium ??
          0
      ) || 0,

    low:
      Number(
        data.severity?.low ??
          data.low ??
          0
      ) || 0,
  };

  const languages =
    data.languages &&
    typeof data.languages === "object" &&
    !Array.isArray(data.languages)
      ? data.languages
      : {};

  const recentScans = normalizeArray(
    data.recentScans
  )
    .map(normalizeReport)
    .filter(Boolean);

  const riskTrend = normalizeArray(
    data.riskTrend
  );

  return {
    ...data,

    success:
      data.success !== false,

    totalScans:
      Number(
        data.totalScans ??
          data.total_scans ??
          0
      ) || 0,

    safeScans:
      Number(
        data.safeScans ??
          data.safe_scans ??
          data.safeProjects ??
          0
      ) || 0,

    unsafeScans:
      Number(
        data.unsafeScans ??
          data.unsafe_scans ??
          data.unsafeProjects ??
          0
      ) || 0,

    safeProjects:
      Number(
        data.safeProjects ??
          data.safeScans ??
          data.safe_scans ??
          0
      ) || 0,

    unsafeProjects:
      Number(
        data.unsafeProjects ??
          data.unsafeScans ??
          data.unsafe_scans ??
          0
      ) || 0,

    averageRisk:
      Number(
        data.averageRisk ??
          data.averageRiskScore ??
          data.average_risk ??
          0
      ) || 0,

    averageRiskScore:
      Number(
        data.averageRiskScore ??
          data.averageRisk ??
          data.average_risk ??
          0
      ) || 0,

    securityGrade:
      data.securityGrade ??
      data.security_grade ??
      "A",

    totalVulnerabilities:
      Number(
        data.totalVulnerabilities ??
          data.total_vulnerabilities ??
          0
      ) || 0,

    severity,

    languages,

    recentScans,

    riskTrend,
  };
};

/* ============================================================
   DASHBOARD
============================================================ */

const Dashboard = () => {
  const {
    user,
    authLoading,
  } = useAuth();

  const [analytics, setAnalytics] =
    useState(null);

  const [reports, setReports] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  /* ==========================================================
     FETCH DASHBOARD ANALYTICS
  ========================================================== */

  const fetchDashboard = useCallback(
    async () => {
      try {
        const res =
          await API.get(
            "/analytics/dashboard"
          );

        console.log(
          "[Dashboard] Analytics API:",
          res.data
        );

        const normalized =
          normalizeAnalytics(
            res.data
          );

        console.log(
          "[Dashboard] Normalized analytics:",
          normalized
        );

        setAnalytics(
          normalized
        );

        return normalized;
      } catch (err) {
        console.error(
          "[Dashboard] Analytics Error:",
          err
        );

        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load dashboard analytics.";

        setError(message);

        throw err;
      }
    },
    []
  );

  /* ==========================================================
     FETCH REPORTS
  ========================================================== */

  const fetchReports = useCallback(
    async () => {
      try {
        const res =
          await API.get(
            "/reports/"
          );

        console.log(
          "[Dashboard] Reports API:",
          res.data
        );

        const rawReports =
          extractReports(
            res.data
          );

        const normalizedReports =
          rawReports
            .map(normalizeReport)
            .filter(Boolean);

        if (
          normalizedReports.length > 0
        ) {
          setReports(
            normalizedReports
          );
        }

        return normalizedReports;
      } catch (err) {
        console.error(
          "[Dashboard] Reports Error:",
          err
        );

        return [];
      }
    },
    []
  );

  /* ==========================================================
     LOAD ALL DATA
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      /*
       * IMPORTANT:
       *
       * Browser refresh-ல் AuthContext localStorage-லிருந்து
       * user-ஐ restore செய்யும் வரை Dashboard API call
       * செய்யக்கூடாது.
       */

      if (authLoading) {
        console.log(
          "[Dashboard] Waiting for authentication restore..."
        );

        return;
      }

      /*
       * ProtectedRoute normally handles this.
       *
       * This is an additional defensive check so Dashboard
       * itself never makes authenticated API calls without
       * a token.
       */

      if (!user?.token) {
        console.log(
          "[Dashboard] No authenticated user. Waiting for route guard..."
        );

        return;
      }

      setLoading(true);
      setError("");

      try {
        console.log(
          "[Dashboard] Authenticated user:",
          {
            username: user.username,
            role: user.role,
            hasToken: Boolean(
              user.token
            ),
          }
        );

        /*
         * Fetch analytics first.
         */

        const dashboardData =
          await fetchDashboard();

        /*
         * Fetch reports separately.
         */

        const reportData =
          await fetchReports();

        if (!mounted) {
          return;
        }

        /*
         * Primary:
         * /reports/
         *
         * Fallback:
         * analytics.recentScans
         */

        if (
          Array.isArray(
            reportData
          ) &&
          reportData.length > 0
        ) {
          setReports(
            reportData
          );
        } else {
          const fallback =
            normalizeArray(
              dashboardData?.recentScans
            )
              .map(
                normalizeReport
              )
              .filter(Boolean);

          setReports(
            fallback
          );
        }
      } catch (err) {
        console.error(
          "[Dashboard] Load Error:",
          err
        );

        if (mounted) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Failed to load dashboard data."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [
    authLoading,
    user?.token,
    user?.username,
    fetchDashboard,
    fetchReports,
  ]);

  /* ==========================================================
     DELETE REPORT
  ========================================================== */

  const handleDelete = async (id) => {
    if (!id) {
      console.error(
        "Report ID is undefined"
      );

      return;
    }

    try {
      await API.delete(
        `/reports/${id}`
      );

      const [
        dashboardData,
        reportData,
      ] = await Promise.all([
        fetchDashboard(),
        fetchReports(),
      ]);

      if (
        Array.isArray(
          reportData
        ) &&
        reportData.length > 0
      ) {
        setReports(
          reportData
        );
      } else {
        setReports(
          normalizeArray(
            dashboardData?.recentScans
          )
            .map(
              normalizeReport
            )
            .filter(Boolean)
        );
      }
    } catch (err) {
      console.error(
        "Delete Error:",
        err
      );

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to delete report"
      );
    }
  };

  /* ==========================================================
     VIEW REPORT
  ========================================================== */

  const handleView = (
    report
  ) => {
    setSelectedReport(
      report
    );

    setDialogOpen(
      true
    );
  };

  /* ==========================================================
     DOWNLOAD REPORT
  ========================================================== */

  const handleDownload = async (
    report
  ) => {
    const reportId =
      report?.id ??
      report?._id ??
      report?.reportId ??
      report?.report_id;

    if (!reportId) {
      console.error(
        "Report ID missing"
      );

      return;
    }

    try {
      const response =
        await API.get(
          `/reports/download/${reportId}`,
          {
            responseType:
              "blob",
          }
        );

      const url =
        window.URL.createObjectURL(
          new Blob([
            response.data,
          ])
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `Security_Report_${reportId}.pdf`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (err) {
      console.error(
        "Download Error:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to download report"
      );
    }
  };

  /* ==========================================================
     AUTH RESTORE LOADING
  ========================================================== */

  if (authLoading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{
            height: "80vh",
          }}
        >
          <CircularProgress
            size={45}
          />
        </Box>
      </Layout>
    );
  }

  /* ==========================================================
     DASHBOARD LOADING
  ========================================================== */

  if (loading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{
            height: "80vh",
          }}
        >
          <CircularProgress
            size={45}
          />
        </Box>
      </Layout>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <Layout>
      <DashboardHeader />

      {/* Error */}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Dashboard Cards */}

      <DashboardCards
        analytics={
          analytics
        }
      />

      {/* Charts */}

      <Grid
        container
        spacing={3}
        sx={{
          mt: 1,
        }}
      >
        {/* Severity Pie Chart */}

        <Grid
          item
          xs={12}
          lg={6}
        >
          <Paper
            elevation={5}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: "#111827",
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
              Vulnerability Severity
            </Typography>

            <SeverityPieChart
              analytics={
                analytics
              }
            />
          </Paper>
        </Grid>

        {/* Language Chart */}

        <Grid
          item
          xs={12}
          lg={6}
        >
          <Paper
            elevation={5}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: "#111827",
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
              Programming Languages
            </Typography>

            <LanguageBarChart
              analytics={
                analytics
              }
            />
          </Paper>
        </Grid>

        {/* Risk Trend */}

        <Grid
          item
          xs={12}
        >
          <Paper
            elevation={5}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: "#111827",
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
              Risk Trend
            </Typography>

            <RiskTrendChart
              data={
                analytics?.riskTrend ||
                []
              }
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Reports */}

      <Paper
        elevation={5}
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 4,
          bgcolor: "#111827",
          overflowX: "auto",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "#fff",
            mb: 3,
            fontWeight: 700,
          }}
        >
          Recent Scan Reports
        </Typography>

        <RecentScansTable
          scans={
            reports
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

      {/* Report Details Dialog */}

      <ReportDetailsDialog
        open={
          dialogOpen
        }
        report={
          selectedReport
        }
        onClose={() => {
          setDialogOpen(
            false
          );

          setSelectedReport(
            null
          );
        }}
      />
    </Layout>
  );
};

export default Dashboard;