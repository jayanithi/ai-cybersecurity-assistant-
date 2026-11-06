import React, { useState } from "react";

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";

import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const Login = () => {
  const navigate = useNavigate();

  const {
    login,
    user,
    authLoading,
  } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // INPUT CHANGE
  // ==========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!form.email || !form.password) {
      setError("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      // ======================================================
      // LOGIN API
      // ======================================================

      const res = await API.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      console.log("Login Response:", res.data);

      // ======================================================
      // GET LOGIN RESPONSE
      // ======================================================

      const token = res?.data?.token;
      const username = res?.data?.username || "";
      const role = res?.data?.role || "user";

      // ======================================================
      // TOKEN VALIDATION
      // ======================================================

      if (!token) {
        console.error(
          "Login succeeded but token was not returned:",
          res?.data
        );

        setError(
          "Login failed: authentication token was not received."
        );

        return;
      }

      // ======================================================
      // SAVE AUTHENTICATION SESSION
      // ======================================================

      const loginSuccess = login({
        token,
        username,
        role,
      });

      if (!loginSuccess) {
        setError(
          "Login failed: unable to save authentication session."
        );

        return;
      }

      // ======================================================
      // VERIFY AUTHENTICATION SESSION
      // ======================================================

      const savedToken =
        localStorage.getItem("token");

      const savedUsername =
        localStorage.getItem("username");

      const savedRole =
        localStorage.getItem("role");

      console.log(
        "===================================="
      );

      console.log(
        "✅ Authentication session saved"
      );

      console.log(
        "Username:",
        savedUsername
      );

      console.log(
        "Role:",
        savedRole
      );

      console.log(
        "Token exists:",
        Boolean(savedToken)
      );

      console.log(
        "Token matches:",
        savedToken === token
      );

      console.log(
        "===================================="
      );

      // ======================================================
      // FINAL TOKEN CHECK
      // ======================================================

      if (!savedToken) {
        setError(
          "Login failed: authentication session was not saved."
        );

        return;
      }

      // ======================================================
      // NAVIGATE TO DASHBOARD
      // ======================================================

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error("Login Error:", err);

      const message =
        err?.response?.data?.message ||
        "Invalid credentials";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // TEXT FIELD STYLE
  // ==========================================================

  const textFieldStyles = {
    "& .MuiInputLabel-root": {
      color: "rgba(255,255,255,0.72)",
    },

    "& .MuiInputLabel-root.Mui-focused": {
      color: "#00E5FF",
    },

    "& .MuiOutlinedInput-root": {
      color: "#ffffff",

      backgroundColor: "#18243A",

      borderRadius: 2,

      "& fieldset": {
        borderColor:
          "rgba(255,255,255,0.20)",
      },

      "&:hover fieldset": {
        borderColor:
          "rgba(0,229,255,0.55)",
      },

      "&.Mui-focused fieldset": {
        borderColor: "#00E5FF",
        borderWidth: 2,
      },

      "& input": {
        color: "#ffffff",
        caretColor: "#00E5FF",
      },

      "& input::placeholder": {
        color:
          "rgba(255,255,255,0.45)",
        opacity: 1,
      },
    },

    "& .MuiInputAdornment-root": {
      color: "#00E5FF",
    },

    "& .MuiSvgIcon-root": {
      color: "#00E5FF",
    },
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",

        background:
          "linear-gradient(135deg, #050914 0%, #0b1220 50%, #111827 100%)",

        display: "flex",

        justifyContent: "center",

        alignItems: "center",

        px: 2,

        py: 4,
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: "100%",

          maxWidth: 450,

          backgroundColor: "#111a2e",

          color: "#fff",

          p: {
            xs: 3,
            sm: 4,
          },

          borderRadius: 4,

          border:
            "1px solid rgba(0,229,255,0.12)",

          boxShadow:
            "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <Typography
          variant="h4"
          align="center"
          sx={{
            fontWeight: 800,

            mb: 1,

            color: "#ffffff",

            letterSpacing: "-0.5px",
          }}
        >
          Welcome Back
        </Typography>

        <Typography
          align="center"
          sx={{
            color:
              "rgba(255,255,255,0.65)",

            mb: 4,

            fontSize: "0.95rem",
          }}
        >
          Login to AI Cybersecurity Assistant
        </Typography>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,

              backgroundColor:
                "rgba(211,47,47,0.14)",

              color: "#ff8a80",

              border:
                "1px solid rgba(255,82,82,0.25)",

              "& .MuiAlert-icon": {
                color: "#ff5252",
              },
            }}
          >
            {error}
          </Alert>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          {/* EMAIL */}

          <TextField
            fullWidth
            size="small"
            label="Email"
            name="email"
            type="email"
            margin="normal"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            disabled={loading}
            sx={textFieldStyles}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* PASSWORD */}

          <TextField
            fullWidth
            size="small"
            type={
              showPassword
                ? "text"
                : "password"
            }
            label="Password"
            name="password"
            margin="normal"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            disabled={loading}
            sx={textFieldStyles}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),

              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    edge="end"
                    sx={{
                      color: "#00E5FF",

                      "&:hover": {
                        backgroundColor:
                          "rgba(0,229,255,0.08)",
                      },
                    }}
                  >
                    {showPassword ? (
                      <VisibilityOff
                        sx={{
                          color: "#00E5FF",
                        }}
                      />
                    ) : (
                      <Visibility
                        sx={{
                          color: "#00E5FF",
                        }}
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* LOGIN BUTTON */}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={
              loading || authLoading
            }
            sx={{
              mt: 3,

              py: 1.5,

              fontWeight: 800,

              borderRadius: 2,

              textTransform: "none",

              fontSize: "1rem",

              background:
                "linear-gradient(90deg, #00acc1, #00e5ff)",

              color: "#001018",

              boxShadow:
                "0 8px 25px rgba(0,229,255,0.20)",

              "&:hover": {
                background:
                  "linear-gradient(90deg, #00b8d4, #18ffff)",

                boxShadow:
                  "0 10px 30px rgba(0,229,255,0.30)",
              },

              "&.Mui-disabled": {
                background:
                  "rgba(0,229,255,0.30)",

                color:
                  "rgba(255,255,255,0.65)",
              },
            }}
          >
            {loading ? (
              <CircularProgress
                size={25}
                sx={{
                  color: "#ffffff",
                }}
              />
            ) : (
              "Login"
            )}
          </Button>
        </Box>

        {/* ==================================================
            REGISTER LINK
        ================================================== */}

        <Typography
          align="center"
          sx={{
            mt: 3,

            color:
              "rgba(255,255,255,0.65)",

            fontSize: "0.95rem",
          }}
        >
          Don't have an account?{" "}

          <Link
            to="/register"
            style={{
              color: "#00E5FF",

              textDecoration: "none",

              fontWeight: 700,
            }}
          >
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;