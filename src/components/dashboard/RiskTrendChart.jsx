import React from "react";

import {
  Paper,
  Typography,
  Box
} from "@mui/material";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";


const RiskTrendChart = ({ data = [] }) => {

  // No Data Handling
  if (!data || data.length === 0) {

    return (
      <Paper
        sx={{
          bgcolor: "#111a2e",
          p: 3,
          borderRadius: 3,
          height: 400,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >

        <Typography
          variant="h6"
          sx={{
            color: "#fff",
            mb: 1
          }}
        >
          Risk Trend
        </Typography>

        <Typography
          sx={{
            color: "#aaa"
          }}
        >
          No risk trend data available
        </Typography>

      </Paper>
    );
  }


  return (

    <Paper
      sx={{
        bgcolor: "#111a2e",
        p: 3,
        borderRadius: 3,
        height: 400,

        border:
          "1px solid rgba(255,255,255,0.08)"
      }}
    >

      {/* Title */}

      <Box
        sx={{
          mb: 3
        }}
      >

        <Typography
          variant="h6"
          sx={{
            color: "#fff",
            fontWeight: 700
          }}
        >
          Risk Score Trend
        </Typography>


        <Typography
          variant="body2"
          sx={{
            color: "#aaa",
            mt: 0.5
          }}
        >
          Security risk score based on recent scans
        </Typography>

      </Box>


      {/* Chart */}

      <ResponsiveContainer
        width="100%"
        height="85%"
      >

        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 20,
            left: -10,
            bottom: 10
          }}
        >

          {/* Grid */}

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#26324a"
          />


          {/* X Axis */}

          <XAxis
            dataKey="date"
            stroke="#aaa"
            tick={{
              fill: "#aaa",
              fontSize: 12
            }}
          />


          {/* Y Axis */}

          <YAxis
            domain={[0, 100]}
            stroke="#aaa"
            tick={{
              fill: "#aaa",
              fontSize: 12
            }}
          />


          {/* Tooltip */}

          <Tooltip
            contentStyle={{
              backgroundColor: "#1d263b",
              border: "1px solid #26324a",
              borderRadius: "10px",
              color: "#fff"
            }}

            labelStyle={{
              color: "#00E5FF"
            }}

            itemStyle={{
              color: "#fff"
            }}
          />


          {/* Legend */}

          <Legend
            wrapperStyle={{
              color: "#fff"
            }}
          />


          {/* Risk Score Line */}

          <Line
            type="monotone"
            dataKey="riskScore"
            name="Risk Score"

            stroke="#FF1744"

            strokeWidth={3}

            dot={{
              r: 5,
              fill: "#FF1744"
            }}

            activeDot={{
              r: 8
            }}
          />

        </LineChart>

      </ResponsiveContainer>

    </Paper>
  );
};


export default RiskTrendChart;