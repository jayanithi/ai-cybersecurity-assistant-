import React from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  TableContainer
} from "@mui/material";

const RecentScansTable = ({
  scans,
  onView,
  onDelete,
  onDownload
}) => {
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "error";
      case "medium":
        return "warning";
      case "safe":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <Paper
      sx={{
        mt: 4,
        p: 3,
        bgcolor: "#111a2e",
        borderRadius: 3
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: "#fff",
          mb: 3
        }}
      >
        Recent Scans
      </Typography>

      <TableContainer>
        <Table>
        <TableHead>

  <TableRow>

    <TableCell sx={{ color: "#fff" }}>
      Language
    </TableCell>

    <TableCell sx={{ color: "#fff" }}>
      Status
    </TableCell>

    <TableCell sx={{ color: "#fff" }}>
      Risk Score
    </TableCell>

    <TableCell sx={{ color: "#fff" }}>
      Issues
    </TableCell>

    <TableCell sx={{ color: "#fff" }}>
      Actions
    </TableCell>

  </TableRow>

</TableHead>

        <TableBody>

  {scans.map((scan) => (

    <TableRow key={scan.id}>

      <TableCell sx={{ color: "#fff" }}>
        {scan.language}
      </TableCell>

      <TableCell>

        <Chip

          label={scan.status}

          color={
            scan.status === "Safe"
              ? "success"
              : "error"
          }

        />

      </TableCell>

      <TableCell sx={{ color: "#fff" }}>
        {scan.riskScore}
      </TableCell>

      <TableCell sx={{ color: "#fff" }}>
        {scan.totalIssues}
      </TableCell>

      <TableCell>

        <Button
          size="small"
          variant="contained"
          onClick={() => onView(scan)}
          sx={{ mr: 1 }}
        >
          View
        </Button>

        <Button
          size="small"
          color="error"
          variant="contained"
          onClick={() => onDelete(scan.id)}
          sx={{ mr: 1 }}
        >
          Delete
        </Button>

        <Button
          size="small"
          color="success"
          variant="contained"
          onClick={() => onDownload(scan)}
        >
          Download
        </Button>

      </TableCell>

    </TableRow>

  ))}

</TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentScansTable;