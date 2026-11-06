import React from "react";
import {
  Box,
  Paper,
  Typography
} from "@mui/material";

import ReactMarkdown from "react-markdown";

const ChatMessage = ({
  role,
  content
}) => {
  const isUser =
    role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent:
          isUser
            ? "flex-end"
            : "flex-start",
        mb: 2
      }}
    >
      <Paper
        sx={{
          p: 2,
          maxWidth: "80%",
          bgcolor: isUser
            ? "#1976d2"
            : "#1e293b",
          color: "#fff"
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700
          }}
        >
          {isUser
            ? "You"
            : "AI Assistant"}
        </Typography>

        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </Paper>
    </Box>
  );
};

export default ChatMessage;