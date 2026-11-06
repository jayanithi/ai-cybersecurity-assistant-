import React, { useEffect, useState } from "react";

import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";

const ChatInput = ({
  onSend,
  loading = false,
  value,
  onChange,
  placeholder = "Ask a cybersecurity question...",
}) => {
  const isControlled =
    value !== undefined;

  const [internalMessage, setInternalMessage] =
    useState("");

  const message = isControlled
    ? value
    : internalMessage;

  const setMessage = (nextValue) => {
    if (isControlled) {
      if (onChange) {
        onChange(nextValue);
      }

      return;
    }

    setInternalMessage(nextValue);
  };

  const handleSubmit = (event) => {
    event?.preventDefault();

    const trimmedMessage =
      String(message || "").trim();

    if (
      !trimmedMessage ||
      loading
    ) {
      return;
    }

    if (onSend) {
      onSend(trimmedMessage);
    }

    setMessage("");
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit(event);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: "100%",
        px: {
          xs: 1,
          sm: 1.5,
          md: 2,
        },
        py: {
          xs: 1,
          sm: 1.2,
        },
      }}
    >
      <TextField
        fullWidth
        multiline
        minRows={1}
        maxRows={5}
        value={message}
        onChange={(event) =>
          setMessage(
            event.target.value
          )
        }
        onKeyDown={handleKeyDown}
        disabled={loading}
        placeholder={placeholder}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="submit"
                disabled={
                  loading ||
                  !String(
                    message || ""
                  ).trim()
                }
                sx={{
                  width: 38,
                  height: 38,
                  color: "#FFFFFF",
                  bgcolor: "#7C4DFF",

                  "&:hover": {
                    bgcolor: "#6D3FEA",
                  },

                  "&.Mui-disabled": {
                    color:
                      "rgba(255,255,255,0.30)",
                    bgcolor:
                      "rgba(124,77,255,0.20)",
                  },
                }}
              >
                {loading ? (
                  <Box
                    sx={{
                      width: 17,
                      height: 17,
                      borderRadius:
                        "50%",
                      border:
                        "2px solid rgba(255,255,255,0.30)",
                      borderTopColor:
                        "#FFFFFF",
                      animation:
                        "chatInputSpin 0.8s linear infinite",
                      "@keyframes chatInputSpin":
                        {
                          from: {
                            transform:
                              "rotate(0deg)",
                          },
                          to: {
                            transform:
                              "rotate(360deg)",
                          },
                        },
                    }}
                  />
                ) : (
                  <SendIcon
                    fontSize="small"
                  />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            color: "#F8FAFC",
            bgcolor: "#101A2B",
            borderRadius: 2,

            "& fieldset": {
              borderColor:
                "rgba(255,255,255,0.09)",
            },

            "&:hover fieldset": {
              borderColor:
                "rgba(0,229,255,0.25)",
            },

            "&.Mui-focused fieldset": {
              borderColor:
                "rgba(0,229,255,0.45)",
            },
          },

          "& textarea": {
            fontSize: "0.78rem",
            lineHeight: 1.5,
          },

          "& textarea::placeholder": {
            color: "#64748B",
            opacity: 1,
          },
        }}
      />
    </Box>
  );
};

export default ChatInput;