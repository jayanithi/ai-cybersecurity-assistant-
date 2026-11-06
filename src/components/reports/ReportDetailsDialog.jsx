import React from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Paper,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Divider
} from "@mui/material";

const severityColor = (severity = "") => {

  switch (severity.toLowerCase()) {

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

const ReportDetailsDialog = ({
  open,
  onClose,
  report
}) => {

  if (!report) return null;

  return (

    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
    >

      <DialogTitle
        sx={{
          bgcolor:"#0f172a",
          color:"#fff",
          fontWeight:700
        }}
      >
        Security Report Details
      </DialogTitle>

      <DialogContent
        sx={{
          bgcolor:"#111827"
        }}
      >

        <Grid
          container
          spacing={2}
          sx={{ mt:1 }}
        >

          <Grid item xs={12} md={4}>

            <Paper
              sx={{
                bgcolor:"#1f2937",
                p:2,
                color:"#fff"
              }}
            >

              <Typography variant="subtitle2">
                Language
              </Typography>

              <Typography variant="h6">
                {report.language}
              </Typography>

            </Paper>

          </Grid>

          <Grid item xs={12} md={4}>

            <Paper
              sx={{
                bgcolor:"#1f2937",
                p:2,
                color:"#fff"
              }}
            >

              <Typography variant="subtitle2">
                Risk Score
              </Typography>

              <Typography
                variant="h6"
                color="#ff5252"
              >
                {report.riskScore}/100
              </Typography>

            </Paper>

          </Grid>

          <Grid item xs={12} md={4}>

            <Paper
              sx={{
                bgcolor:"#1f2937",
                p:2,
                color:"#fff"
              }}
            >

              <Typography variant="subtitle2">
                Security Grade
              </Typography>

              <Typography
                variant="h5"
                color="#00E5FF"
              >
                {report.grade}
              </Typography>

            </Paper>

          </Grid>

          <Grid item xs={12} md={6}>

            <Paper
              sx={{
                bgcolor:"#1f2937",
                p:2,
                color:"#fff"
              }}
            >

              <Typography variant="subtitle2">
                Status
              </Typography>

              <Chip
                label={report.status}
                color={
                  report.status==="Safe"
                  ? "success"
                  : "error"
                }
              />

            </Paper>

          </Grid>

          <Grid item xs={12} md={6}>

            <Paper
              sx={{
                bgcolor:"#1f2937",
                p:2,
                color:"#fff"
              }}
            >

              <Typography variant="subtitle2">
                Total Issues
              </Typography>

              <Typography variant="h6">
                {report.totalIssues}
              </Typography>

            </Paper>

          </Grid>

        </Grid>

        <Divider sx={{ my:3 }}/>

        <Typography
          variant="h6"
          sx={{
            color:"#fff",
            mb:2
          }}
        >
          Vulnerabilities
        </Typography>

        <TableContainer
          component={Paper}
          sx={{
            bgcolor:"#1f2937"
          }}
        >

          <Table>

            <TableHead>

              <TableRow>

                <TableCell sx={{color:"#fff"}}>
                  Severity
                </TableCell>

                <TableCell sx={{color:"#fff"}}>
                  CWE
                </TableCell>

                <TableCell sx={{color:"#fff"}}>
                  Description
                </TableCell>

                <TableCell sx={{color:"#fff"}}>
                  Line
                </TableCell>

              </TableRow>

            </TableHead>

            <TableBody>

              {(report.vulnerabilities || []).map((v,index)=>(

                <TableRow key={index}>

                  <TableCell>

                    <Chip
                      label={v.severity}
                      color={severityColor(v.severity)}
                    />

                  </TableCell>

                  <TableCell sx={{color:"#fff"}}>
                    {v.cwe}
                  </TableCell>

                  <TableCell sx={{color:"#fff"}}>
                    {v.description}
                  </TableCell>

                  <TableCell sx={{color:"#fff"}}>
                    {v.line}
                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </TableContainer>

        {report.aiFix && (

          <>

            <Divider sx={{my:3}}/>

            <Typography
              variant="h6"
              sx={{
                color:"#fff",
                mb:2
              }}
            >
              AI Secure Fix
            </Typography>

            <Paper
              sx={{
                bgcolor:"#1f2937",
                p:2
              }}
            >

              <Typography
                component="pre"
                sx={{
                  color:"#ddd",
                  whiteSpace:"pre-wrap",
                  fontFamily:"monospace"
                }}
              >
                {report.aiFix}
              </Typography>

            </Paper>

          </>

        )}

      </DialogContent>

      <DialogActions
        sx={{
          bgcolor:"#0f172a"
        }}
      >

        <Button
          variant="contained"
          onClick={onClose}
        >
          Close
        </Button>

      </DialogActions>

    </Dialog>

  );

};

export default ReportDetailsDialog;