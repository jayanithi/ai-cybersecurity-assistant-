
import React, { useState } from "react";

import {
  Button,
  Stack,
  CircularProgress
} from "@mui/material";

import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import API from "../../services/api";


const ReportExportButtons = ({
  search = "",
  status = "",
  grade = "",
  riskLevel = ""
}) => {

  // ==========================================================
  // LOADING STATES
  // ==========================================================

  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);


  // ==========================================================
  // BUILD QUERY STRING
  // ==========================================================

  const buildQueryString = () => {

    const params = new URLSearchParams();

    if (search && search.trim()) {
      params.append(
        "search",
        search.trim()
      );
    }

    if (status) {
      params.append(
        "status",
        status
      );
    }

    if (grade) {
      params.append(
        "grade",
        grade
      );
    }

    if (riskLevel) {
      params.append(
        "riskLevel",
        riskLevel
      );
    }

    return params.toString();
  };


  // ==========================================================
  // DOWNLOAD FILE
  // ==========================================================

  const downloadFile = (
    blob,
    filename
  ) => {

    const url = window.URL.createObjectURL(
      blob
    );

    const link = document.createElement(
      "a"
    );

    link.href = url;
    link.download = filename;

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
  };


  // ==========================================================
  // EXPORT CSV
  // ==========================================================

  const handleExportCSV = async () => {

    try {

      setCsvLoading(true);

      const queryString =
        buildQueryString();

      const endpoint =
        `/reports/export/csv${
          queryString
            ? `?${queryString}`
            : ""
        }`;

      console.log(
        "CSV Export:",
        endpoint
      );

      const response =
        await API.get(
          endpoint,
          {
            responseType: "blob"
          }
        );

      const blob =
        new Blob(
          [response.data],
          {
            type: "text/csv;charset=utf-8;"
          }
        );

      const date =
        new Date()
          .toISOString()
          .slice(0, 10);

      downloadFile(
        blob,
        `Security_Scan_Reports_${date}.csv`
      );

    } catch (err) {

      console.error(
        "CSV Export Error:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to export CSV reports."
      );

    } finally {

      setCsvLoading(false);

    }
  };


  // ==========================================================
  // EXPORT PDF
  // ==========================================================

  const handleExportPDF = async () => {

    try {

      setPdfLoading(true);

      const queryString =
        buildQueryString();

      const endpoint =
        `/reports/export/pdf${
          queryString
            ? `?${queryString}`
            : ""
        }`;

      console.log(
        "PDF Export:",
        endpoint
      );

      const response =
        await API.get(
          endpoint,
          {
            responseType: "blob"
          }
        );

      const blob =
        new Blob(
          [response.data],
          {
            type: "application/pdf"
          }
        );

      const date =
        new Date()
          .toISOString()
          .slice(0, 10);

      downloadFile(
        blob,
        `Security_Scan_Reports_${date}.pdf`
      );

    } catch (err) {

      console.error(
        "PDF Export Error:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to export PDF reports."
      );

    } finally {

      setPdfLoading(false);

    }
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <Stack
      direction="row"
      spacing={2}
      flexWrap="wrap"
      useFlexGap
    >

      {/* ======================================================
          EXPORT CSV
      ====================================================== */}

      <Button
        variant="contained"
        startIcon={
          csvLoading ? (
            <CircularProgress
              size={20}
              color="inherit"
            />
          ) : (
            <DownloadIcon />
          )
        }
        onClick={handleExportCSV}
        disabled={
          csvLoading ||
          pdfLoading
        }
        sx={{
          bgcolor: "#00E5FF",
          color: "#000",
          fontWeight: 700,

          "&:hover": {
            bgcolor: "#00B8D4"
          }
        }}
      >

        {csvLoading
          ? "Exporting CSV..."
          : "Export CSV"}

      </Button>


      {/* ======================================================
          EXPORT PDF
      ====================================================== */}

      <Button
        variant="contained"
        startIcon={
          pdfLoading ? (
            <CircularProgress
              size={20}
              color="inherit"
            />
          ) : (
            <PictureAsPdfIcon />
          )
        }
        onClick={handleExportPDF}
        disabled={
          pdfLoading ||
          csvLoading
        }
        sx={{
          bgcolor: "#FF1744",
          color: "#fff",
          fontWeight: 700,

          "&:hover": {
            bgcolor: "#D50000"
          }
        }}
      >

        {pdfLoading
          ? "Generating PDF..."
          : "Export PDF"}

      </Button>

    </Stack>

  );
};


export default ReportExportButtons;

