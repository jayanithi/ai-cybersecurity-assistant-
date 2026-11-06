import React, { useState } from "react";
import { Box, Toolbar } from "@mui/material";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const drawerWidth = 240;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Navbar */}
      <Navbar handleDrawerToggle={handleDrawerToggle} />

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        items={[
          {
            text: "AI Chatbot",
            path: "/chatbot",
          },
        ]}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: `calc(100% - ${drawerWidth}px)`,
          },
          backgroundColor: "#0b1220",
          minHeight: "100vh",
          p: {
            xs: 2,
            sm: 3,
            md: 4,
          },
          overflowX: "hidden",
        }}
      >
        <Toolbar />

        {children}
      </Box>
    </Box>
  );
};

export default Layout;