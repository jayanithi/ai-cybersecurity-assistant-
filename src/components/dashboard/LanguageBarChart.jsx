import React from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";

import {
  Box,
  Typography
} from "@mui/material";


const LanguageBarChart = ({ analytics }) => {

  if (!analytics || !analytics.languages) {

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
          No language data available
        </Typography>

      </Box>

    );

  }


 const languages = analytics.languages || {};


const chartData = [

  {
    language: "Python",
    scans: Number(
      languages.python ||
      languages.Python ||
      0
    )
  },

  {
    language: "JavaScript",
    scans: Number(
      languages.javascript ||
      languages.JavaScript ||
      languages.js ||
      0
    )
  },

  {
    language: "PHP",
    scans: Number(
      languages.php ||
      languages.PHP ||
      0
    )
  },

  {
    language: "Java",
    scans: Number(
      languages.java ||
      languages.Java ||
      0
    )
  }

];

  if (chartData.length === 0) {

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
          No language data available
        </Typography>

      </Box>

    );

  }


  return (

    <ResponsiveContainer
      width="100%"
      height={350}
    >

      <BarChart

        data={chartData}

        margin={{
          top: 20,
          right: 20,
          left: 0,
          bottom: 20
        }}

      >

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#26324a"
        />


        <XAxis

          dataKey="language"

          stroke="#aaa"

          tick={{
            fill: "#aaa",
            fontSize: 13
          }}

        />


        <YAxis

          allowDecimals={false}

          stroke="#aaa"

          tick={{
            fill: "#aaa",
            fontSize: 13
          }}

        />


        <Tooltip

          contentStyle={{
            backgroundColor: "#1d263b",
            border: "1px solid #26324a",
            borderRadius: "10px",
            color: "#fff"
          }}

          cursor={{
            fill: "rgba(255,255,255,0.05)"
          }}

        />


        <Legend />


        <Bar

          dataKey="scans"

          name="Scans"

          radius={[8, 8, 0, 0]}

        >

          {chartData.map(
            (entry, index) => (

              <Cell

                key={`cell-${index}`}

                fill="#00E5FF"

              />

            )
          )}

        </Bar>


      </BarChart>

    </ResponsiveContainer>

  );

};


export default LanguageBarChart;