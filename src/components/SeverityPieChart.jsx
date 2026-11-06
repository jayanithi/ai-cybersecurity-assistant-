import React from "react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";

import {
  Box,
  Typography
} from "@mui/material";


const SeverityPieChart = ({ analytics }) => {

  if (!analytics || !analytics.severity) {

    return (

      <Box
        sx={{
          height: 350,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >

        <Typography sx={{ color: "#aaa" }}>
          No severity data available
        </Typography>

      </Box>

    );

  }


  const severity = analytics.severity;


  const chartData = [

    {
      name: "Critical",
      value: Number(severity.critical || 0)
    },

    {
      name: "High",
      value: Number(severity.high || 0)
    },

    {
      name: "Medium",
      value: Number(severity.medium || 0)
    },

    {
      name: "Low",
      value: Number(severity.low || 0)
    }

  ];


  // Remove zero values
  const filteredData = chartData.filter(
    (item) => item.value > 0
  );


  if (filteredData.length === 0) {

    return (

      <Box
        sx={{
          height: 350,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >

        <Typography sx={{ color: "#aaa" }}>
          No vulnerabilities found
        </Typography>

      </Box>

    );

  }


  const COLORS = [
    "#FF1744",
    "#FF5252",
    "#FFAB00",
    "#00E5FF"
  ];


  return (

    <ResponsiveContainer
      width="100%"
      height={350}
    >

      <PieChart>

        <Pie

          data={filteredData}

          dataKey="value"

          nameKey="name"

          cx="50%"

          cy="50%"

          outerRadius={110}

          label

        >

          {filteredData.map(
            (entry, index) => (

              <Cell

                key={`cell-${index}`}

                fill={
                  COLORS[
                    chartData.findIndex(
                      item =>
                        item.name === entry.name
                    )
                  ]
                }

              />

            )
          )}

        </Pie>


        <Tooltip

          contentStyle={{
            backgroundColor: "#1d263b",
            border: "1px solid #26324a",
            borderRadius: "10px"
          }}

        />


        <Legend />


      </PieChart>

    </ResponsiveContainer>

  );

};


export default SeverityPieChart;