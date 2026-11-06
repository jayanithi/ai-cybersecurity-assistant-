import React from "react";

import {
  Drawer,
  Box,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import CodeIcon from "@mui/icons-material/Code";
import DescriptionIcon from "@mui/icons-material/Description";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SecurityIcon from "@mui/icons-material/Security";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

import { NavLink } from "react-router-dom";

const drawerWidth = 240;

// ==========================================
// SIDEBAR MENU ITEMS
// ==========================================

const menuItems = [
  {
    text: "Dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
  },
  {
    text: "Scanner",
    icon: <CodeIcon />,
    path: "/scanner",
  },
  {
    text: "Reports",
    icon: <DescriptionIcon />,
    path: "/reports",
  },
  {
    text: "AI Chatbot",
    icon: <SmartToyIcon />,
    path: "/chatbot",
  },
  {
    text: "Profile",
    icon: <PersonOutlineIcon />,
    path: "/profile",
  },
];

// ==========================================
// SIDEBAR COMPONENT
// ==========================================

const Sidebar = ({
  mobileOpen,
  handleDrawerToggle,
}) => {
  // ==========================================
  // DRAWER CONTENT
  // ==========================================

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        bgcolor: "#111a2e",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ==========================================
          LOGO / BRAND
      ========================================== */}

      <Toolbar
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "center",
          minHeight: 64,
        }}
      >
        <SecurityIcon
          sx={{
            color: "#00E5FF",
            fontSize: 32,
          }}
        />

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          Cyber AI
        </Typography>
      </Toolbar>

      {/* ==========================================
          DIVIDER
      ========================================== */}

      <Divider
        sx={{
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />

      {/* ==========================================
          NAVIGATION MENU
      ========================================== */}

      <List
        sx={{
          px: 0.5,
          py: 1,
        }}
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.text}
            to={item.path}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
            onClick={
              mobileOpen
                ? handleDrawerToggle
                : undefined
            }
          >
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                sx={{
                  mx: 0.5,
                  my: 0.5,
                  minHeight: 48,
                  borderRadius: 2,

                  transition: "all 0.2s ease",

                  // ==================================
                  // ACTIVE ITEM
                  // ==================================

                  "&.Mui-selected": {
                    bgcolor:
                      "rgba(0,229,255,0.18)",
                    color: "#00E5FF",

                    "& .MuiListItemIcon-root": {
                      color: "#00E5FF",
                    },

                    "&:hover": {
                      bgcolor:
                        "rgba(0,229,255,0.22)",
                    },
                  },

                  // ==================================
                  // HOVER
                  // ==================================

                  "&:hover": {
                    bgcolor:
                      "rgba(255,255,255,0.06)",
                  },
                }}
              >
                {/* ==================================
                    ICON
                ================================== */}

                <ListItemIcon
                  sx={{
                    color: "#fff",
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                {/* ==================================
                    TEXT
                ================================== */}

                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight:
                      isActive ? 700 : 500,
                  }}
                />
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>
    </Box>
  );

  // ==========================================
  // SIDEBAR RETURN
  // ==========================================

  return (
    <Box
      component="nav"
      sx={{
        width: {
          md: drawerWidth,
        },
        flexShrink: {
          md: 0,
        },
      }}
    >
      {/* ==========================================
          MOBILE DRAWER
      ========================================== */}

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: {
            xs: "block",
            md: "none",
          },

          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "#111a2e",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* ==========================================
          DESKTOP DRAWER
      ========================================== */}

      <Drawer
        variant="permanent"
        open
        sx={{
          display: {
            xs: "none",
            md: "block",
          },

          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "#111a2e",
            borderRight:
              "1px solid rgba(255,255,255,0.08)",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;