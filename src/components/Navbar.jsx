import React, {
  useEffect,
  useState,
} from "react";

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import SecurityIcon from "@mui/icons-material/Security";

import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import API from "../services/api";

const Navbar = ({
  handleDrawerToggle,
}) => {
  const {
    user,
    logout,
    authLoading,
  } = useAuth();

  const theme = useTheme();

  const isMobile = useMediaQuery(
    theme.breakpoints.down("md")
  );

  const navigate = useNavigate();

  // ==========================================
  // PROFILE PICTURE STATE
  // ==========================================

  const [
    profilePicture,
    setProfilePicture,
  ] = useState(() => {
    return (
      user?.profile_picture ||
      user?.profilePicture ||
      localStorage.getItem("profile_picture") ||
      localStorage.getItem("profilePicture") ||
      ""
    );
  });

  // ==========================================
  // GET PROFILE PICTURE URL
  // ==========================================

  const getProfileImage = (
    picture = profilePicture
  ) => {
    if (!picture) {
      return "";
    }

    // Already full URL
    if (
      picture.startsWith("http://") ||
      picture.startsWith("https://") ||
      picture.startsWith("data:")
    ) {
      return picture;
    }

    const baseURL =
      API?.defaults?.baseURL ||
      "http://127.0.0.1:5000";

    let cleanBaseURL =
      baseURL.replace(/\/+$/, "");

    /*
      If Axios baseURL is:
      http://127.0.0.1:5000/api

      But Flask profile route is:
      /profile/picture/xxx.jpg

      remove /api before joining.
    */

    cleanBaseURL =
      cleanBaseURL.replace(
        /\/api$/,
        ""
      );

    const cleanPicture =
      picture.startsWith("/")
        ? picture
        : `/${picture}`;

    return `${cleanBaseURL}${cleanPicture}`;
  };

  // ==========================================
  // LOAD PROFILE FROM BACKEND
  // ==========================================

  const loadProfilePicture = async () => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        "";

      // --------------------------------------
      // No token = don't call profile API
      // --------------------------------------

      if (!token) {
        return;
      }

      const response =
        await API.get(
          "/profile",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const backendUser =
        response?.data?.user ||
        response?.data?.profile ||
        response?.data;

      const picture =
        backendUser?.profile_picture ||
        backendUser?.profilePicture ||
        "";

      if (!picture) {
        return;
      }

      setProfilePicture(picture);
    } catch (error) {
      /*
        IMPORTANT:
        Do NOT redirect to /login here.

        A profile-picture request failure should
        never log the user out or change the
        current page.
      */

      console.error(
        "Navbar profile load error:",
        error
      );
    }
  };

  // ==========================================
  // INITIAL PROFILE LOAD
  // ==========================================
  //
  // IMPORTANT FIX:
  //
  // Wait until AuthContext finishes restoring
  // the user from localStorage.
  //
  // This prevents Navbar from making profile
  // requests during the initial authentication
  // restoration phase.
  // ==========================================

  useEffect(() => {
    // ----------------------------------------
    // Authentication is still restoring
    // ----------------------------------------

    if (authLoading) {
      return;
    }

    // ----------------------------------------
    // Auth restoration completed
    // ----------------------------------------

    if (user) {
      setProfilePicture(
        user.profile_picture ||
        ""
      );

      loadProfilePicture();
    } else {
      setProfilePicture("");
    }
  }, [
    user,
    authLoading,
  ]);

  // ==========================================
  // LISTEN PROFILE UPDATES
  // ==========================================

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const picture =
        event?.detail?.profile_picture ||
        event?.detail?.profilePicture ||
        localStorage.getItem("profile_picture") ||
        localStorage.getItem("profilePicture") ||
        "";

      setProfilePicture(picture);
    };

    // UserProfile.jsx dispatches "profile-updated" after upload/remove.
    window.addEventListener(
      "profile-updated",
      handleProfileUpdated
    );

    // Keep backward compatibility with the older event name.
    window.addEventListener(
      "profileUpdated",
      handleProfileUpdated
    );

    // Pick up an already-saved image when Navbar mounts.
    handleProfileUpdated();

    return () => {
      window.removeEventListener(
        "profile-updated",
        handleProfileUpdated
      );

      window.removeEventListener(
        "profileUpdated",
        handleProfileUpdated
      );
    };
  }, []);

  // ==========================================
  // PROFILE IMAGE ERROR
  // ==========================================

  const handleImageError = (
    event
  ) => {
    console.error(
      "Profile image failed to load:",
      getProfileImage()
    );

    event.currentTarget.style.display =
      "none";

    setProfilePicture("");
  };

  // ==========================================
  // GET INITIALS
  // ==========================================

  const getInitials = () => {
    const value =
      user?.name ||
      user?.username ||
      "U";

    const parts =
      String(value)
        .trim()
        .split(/\s+/);

    if (
      parts.length >= 2
    ) {
      return (
        `${parts[0][0]}${parts[1][0]}`
      ).toUpperCase();
    }

    return String(value)
      .substring(0, 2)
      .toUpperCase();
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    logout();

    setProfilePicture("");

    window.location.href =
      "/login";
  };

  // ==========================================
  // OPEN PROFILE
  // ==========================================

  const handleProfileClick = () => {
    navigate(
      "/profile"
    );
  };

  // ==========================================
  // PROFILE IMAGE
  // ==========================================

  const profileImage =
    getProfileImage();

  // ==========================================
  // UI
  // ==========================================

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background:
          "rgba(11,18,32,0.95)",

        backdropFilter:
          "blur(10px)",

        borderBottom:
          "1px solid rgba(255,255,255,0.08)",

        zIndex:
          (theme) =>
            theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>

        {/* =====================================
            MOBILE MENU
            ===================================== */}

        {isMobile && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={
              handleDrawerToggle
            }
            sx={{
              mr: 2,
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* =====================================
            LOGO
            ===================================== */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
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
              color: "#fff",

              display: {
                xs: "none",
                sm: "block",
              },
            }}
          >
            AI Cybersecurity Assistant
          </Typography>
        </Box>

        {/* =====================================
            SPACER
            ===================================== */}

        <Box
          sx={{
            flexGrow: 1,
          }}
        />

        {/* =====================================
            ROLE
            ===================================== */}

        {user && (
          <Chip
            label={
              user.role?.toUpperCase() ||
              "USER"
            }
            color={
              user.role === "admin"
                ? "error"
                : "primary"
            }
            sx={{
              mr: 2,
              fontWeight: 600,

              display: {
                xs: "none",
                sm: "flex",
              },
            }}
          />
        )}

        {/* =====================================
            PROFILE
            ===================================== */}

        {user && (
          <Tooltip
            title="Open Profile"
          >
            <IconButton
              onClick={
                handleProfileClick
              }
              sx={{
                mr: 1,
                p: 0.5,
              }}
            >
              <Avatar
                key={
                  profileImage ||
                  "default-avatar"
                }
                src={
                  profileImage ||
                  undefined
                }
                alt={
                  user.name ||
                  "User"
                }
                onError={
                  handleImageError
                }
                sx={{
                  width: 42,
                  height: 42,

                  bgcolor:
                    "#00E5FF",

                  color:
                    "#000",

                  fontWeight: 700,

                  border:
                    "2px solid rgba(0,229,255,0.5)",

                  cursor:
                    "pointer",
                }}
              >
                {!profileImage &&
                  getInitials()}
              </Avatar>
            </IconButton>
          </Tooltip>
        )}

        {/* =====================================
            LOGOUT
            ===================================== */}

        {user && (
          <Tooltip
            title="Logout"
          >
            <IconButton
              color="inherit"
              onClick={
                handleLogout
              }
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        )}

      </Toolbar>
    </AppBar>
  );
};

export default Navbar;