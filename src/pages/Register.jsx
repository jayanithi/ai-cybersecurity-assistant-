
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

import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // INPUT CHANGE
  // ==========================================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please fill all fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post(
        "/auth/register",
        {
          username: form.name,
          email: form.email,
          password: form.password,
        }
      );

      console.log(
        "Register Response:",
        res.data
      );

      setSuccess(
        res.data.message ||
          "Registration successful"
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error(
        "Registration Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // COMMON TEXT FIELD STYLE
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

          maxWidth: 500,

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
          Create Account
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
          Join AI Cybersecurity Assistant
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
            SUCCESS
        ================================================== */}

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 2,

              backgroundColor:
                "rgba(46,125,50,0.14)",

              color: "#69f0ae",

              border:
                "1px solid rgba(105,240,174,0.25)",

              "& .MuiAlert-icon": {
                color: "#69f0ae",
              },
            }}
          >
            {success}
          </Alert>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          {/* FULL NAME */}

          <TextField
            fullWidth
            size="small"
            label="Full Name"
            name="name"
            margin="normal"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            sx={textFieldStyles}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />

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
            label="Password"
            name="password"
            margin="normal"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
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
                    edge="end"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
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
                          color:
                            "#00E5FF",
                        }}
                      />
                    ) : (
                      <Visibility
                        sx={{
                          color:
                            "#00E5FF",
                        }}
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* CONFIRM PASSWORD */}

          <TextField
            fullWidth
            size="small"
            label="Confirm Password"
            name="confirmPassword"
            margin="normal"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
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
                    edge="end"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    sx={{
                      color: "#00E5FF",

                      "&:hover": {
                        backgroundColor:
                          "rgba(0,229,255,0.08)",
                      },
                    }}
                  >
                    {showConfirmPassword ? (
                      <VisibilityOff
                        sx={{
                          color:
                            "#00E5FF",
                        }}
                      />
                    ) : (
                      <Visibility
                        sx={{
                          color:
                            "#00E5FF",
                        }}
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* REGISTER BUTTON */}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
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
              "Register"
            )}
          </Button>
        </Box>

        {/* ==================================================
            LOGIN LINK
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
          Already have an account?{" "}

          <Link
            to="/login"
            style={{
              color: "#00E5FF",

              textDecoration: "none",

              fontWeight: 700,
            }}
          >
            Login
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;

