import React, { useMemo, useState } from "react";

import {
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Tooltip,
  Divider,
  CircularProgress,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

const getConversationId = (conversation) =>
  conversation?._id ||
  conversation?.id ||
  conversation?.conversation_id ||
  conversation?.conversationId ||
  null;

const getConversationTitle = (conversation) =>
  conversation?.title ||
  conversation?.name ||
  conversation?.conversation_title ||
  conversation?.conversationTitle ||
  conversation?.subject ||
  conversation?.first_message ||
  conversation?.firstMessage ||
  "New Conversation";

const getConversationPreview = (conversation) => {
  const messages =
    conversation?.messages ||
    conversation?.chat_history ||
    conversation?.chatHistory ||
    [];

  if (Array.isArray(messages) && messages.length > 0) {
    const lastMessage =
      [...messages]
        .reverse()
        .find(
          (item) =>
            item?.content ||
            item?.message ||
            item?.text
        );

    if (lastMessage) {
      return String(
        lastMessage.content ||
          lastMessage.message ||
          lastMessage.text ||
          ""
      )
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return (
    conversation?.last_message ||
    conversation?.lastMessage ||
    conversation?.preview ||
    conversation?.lastMessageText ||
    ""
  );
};

const getConversationCount = (conversation) => {
  if (
    Number.isFinite(
      Number(conversation?.message_count)
    )
  ) {
    return Number(
      conversation.message_count
    );
  }

  if (
    Number.isFinite(
      Number(conversation?.messageCount)
    )
  ) {
    return Number(
      conversation.messageCount
    );
  }

  if (
    Number.isFinite(
      Number(conversation?.messages_count)
    )
  ) {
    return Number(
      conversation.messages_count
    );
  }

  const messages =
    conversation?.messages ||
    conversation?.chat_history ||
    conversation?.chatHistory ||
    [];

  return Array.isArray(messages)
    ? messages.length
    : 0;
};

const getConversationDate = (conversation) =>
  conversation?.updated_at ||
  conversation?.updatedAt ||
  conversation?.created_at ||
  conversation?.createdAt ||
  conversation?.timestamp ||
  conversation?.date ||
  null;

const ConversationSidebar = ({
  open = true,
  onClose,

  conversations = [],

  activeConversationId,

  loading = false,

  conversationsLoading = false,

  onNewChat,

  onNewConversation,

  onSelectConversation,

  onDeleteConversation,

  onRenameConversation,
}) => {
  const [search, setSearch] = useState("");

  const handleNewConversation = () => {
    if (loading) {
      return;
    }

    if (onNewChat) {
      onNewChat();
      return;
    }

    if (onNewConversation) {
      onNewConversation();
    }
  };

  const handleSelectConversation = (
    conversationId
  ) => {
    if (!conversationId || loading) {
      return;
    }

    if (onSelectConversation) {
      onSelectConversation(
        conversationId
      );
    }

    if (onClose) {
      onClose();
    }
  };

  const handleDeleteConversation = (
    event,
    conversationId
  ) => {
    event.stopPropagation();

    if (!conversationId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) {
      return;
    }

    if (onDeleteConversation) {
      onDeleteConversation(
        conversationId
      );
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "";
    }

    try {
      const date = new Date(
        timestamp
      );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      return date.toLocaleDateString(
        [],
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    } catch {
      return "";
    }
  };

  const filteredConversations =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!Array.isArray(conversations)) {
        return [];
      }

      if (!query) {
        return conversations;
      }

      return conversations.filter(
        (conversation) => {
          const title =
            getConversationTitle(
              conversation
            ).toLowerCase();

          const preview =
            getConversationPreview(
              conversation
            ).toLowerCase();

          return (
            title.includes(query) ||
            preview.includes(query)
          );
        }
      );
    }, [
      conversations,
      search,
    ]);

  const isLoading =
    conversationsLoading;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "#0B1220",
        color: "#fff",
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          px: 1.6,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              bgcolor:
                "rgba(0,229,255,0.08)",
              border:
                "1px solid rgba(0,229,255,0.15)",
            }}
          >
            <HistoryIcon
              sx={{
                color: "#00E5FF",
                fontSize: 18,
              }}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: "#F8FAFC",
                fontWeight: 800,
                fontSize: "0.9rem",
              }}
            >
              Conversations
            </Typography>

            <Typography
              sx={{
                color: "#64748B",
                fontSize: "0.63rem",
              }}
            >
              {Array.isArray(
                conversations
              )
                ? `${conversations.length} saved chat${
                    conversations.length ===
                    1
                      ? ""
                      : "s"
                  }`
                : "Saved chats"}
            </Typography>
          </Box>
        </Box>

        {onClose && (
          <Tooltip title="Close history">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: "#94A3B8",
                "&:hover": {
                  color: "#FFFFFF",
                  bgcolor:
                    "rgba(255,255,255,0.07)",
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* NEW CHAT */}

      <Box
        sx={{
          px: 1.4,
          pb: 1.2,
          flexShrink: 0,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={
            handleNewConversation
          }
          disabled={loading}
          sx={{
            minHeight: 40,
            color: "#C4B5FD",
            borderColor:
              "rgba(196,181,253,0.25)",
            borderRadius: 1.7,
            textTransform: "none",
            fontWeight: 700,
            "&:hover": {
              borderColor:
                "#C4B5FD",
              bgcolor:
                "rgba(124,77,255,0.08)",
            },
          }}
        >
          New Conversation
        </Button>
      </Box>

      {/* SEARCH */}

      <Box
        sx={{
          px: 1.4,
          pb: 1.2,
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    color: "#64748B",
                    fontSize: 19,
                  }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 40,
              color: "#FFFFFF",
              bgcolor: "#111B2D",
              borderRadius: 1.7,
              "& fieldset": {
                borderColor:
                  "rgba(255,255,255,0.08)",
              },
              "&:hover fieldset": {
                borderColor:
                  "rgba(0,229,255,0.30)",
              },
              "&.Mui-focused fieldset": {
                borderColor:
                  "#00E5FF",
              },
            },

            "& input::placeholder": {
              color: "#64748B",
              opacity: 1,
            },
          }}
        />
      </Box>

      <Divider
        sx={{
          borderColor:
            "rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      />

      {/* LIST */}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          py: 1,

          "&::-webkit-scrollbar": {
            width: 5,
          },

          "&::-webkit-scrollbar-thumb": {
            background: "#26344D",
            borderRadius: 10,
          },
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent:
                "center",
              gap: 1,
              p: 4,
            }}
          >
            <CircularProgress
              size={24}
              sx={{
                color: "#7C4DFF",
              }}
            />

            <Typography
              sx={{
                color: "#64748B",
                fontSize: "0.72rem",
              }}
            >
              Loading conversations...
            </Typography>
          </Box>
        ) : filteredConversations.length ===
          0 ? (
          <Box
            sx={{
              px: 2,
              py: 5,
              textAlign: "center",
            }}
          >
            <ChatBubbleOutlineIcon
              sx={{
                color: "#334155",
                fontSize: 40,
                mb: 1,
              }}
            />

            <Typography
              sx={{
                color: "#94A3B8",
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
            >
              {search.trim()
                ? "No conversations found"
                : "No conversations yet"}
            </Typography>

            <Typography
              sx={{
                color: "#475569",
                fontSize: "0.68rem",
                mt: 0.5,
                lineHeight: 1.5,
              }}
            >
              {search.trim()
                ? "Try another search."
                : "Send your first AI message to create a conversation."}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredConversations.map(
              (
                conversation,
                index
              ) => {
                const id =
                  getConversationId(
                    conversation
                  );

                if (!id) {
                  return null;
                }

                const title =
                  getConversationTitle(
                    conversation
                  );

                const preview =
                  getConversationPreview(
                    conversation
                  );

                const count =
                  getConversationCount(
                    conversation
                  );

                const date =
                  formatTime(
                    getConversationDate(
                      conversation
                    )
                  );

                const active =
                  String(
                    activeConversationId
                  ) ===
                  String(id);

                return (
                  <ListItemButton
                    key={`${id}-${index}`}
                    selected={active}
                    disabled={loading}
                    onClick={() =>
                      handleSelectConversation(
                        id
                      )
                    }
                    sx={{
                      mx: 0.8,
                      mb: 0.5,
                      px: 1.2,
                      py: 1,
                      borderRadius: 1.8,
                      alignItems:
                        "flex-start",
                      border:
                        "1px solid transparent",

                      "&.Mui-selected": {
                        bgcolor:
                          "rgba(124,77,255,0.16)",
                        borderColor:
                          "rgba(124,77,255,0.28)",
                      },

                      "&.Mui-selected:hover":
                        {
                          bgcolor:
                            "rgba(124,77,255,0.22)",
                        },

                      "&:hover": {
                        bgcolor:
                          "rgba(255,255,255,0.045)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: 1.3,
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        flexShrink: 0,
                        mr: 1,
                        mt: 0.2,
                        bgcolor: active
                          ? "rgba(124,77,255,0.20)"
                          : "rgba(0,229,255,0.06)",
                        border: active
                          ? "1px solid rgba(124,77,255,0.25)"
                          : "1px solid rgba(0,229,255,0.10)",
                      }}
                    >
                      <ChatBubbleOutlineIcon
                        sx={{
                          fontSize: 15,
                          color: active
                            ? "#C4B5FD"
                            : "#00E5FF",
                        }}
                      />
                    </Box>

                    <ListItemText
                      sx={{
                        minWidth: 0,
                        mr: 0.5,
                      }}
                      primary={
                        <Typography
                          sx={{
                            color:
                              "#E5E7EB",
                            fontWeight:
                              active
                                ? 800
                                : 600,
                            fontSize:
                              "0.78rem",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.35 }}>
                          {preview && (
                            <Typography
                              sx={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "0.65rem",
                                lineHeight:
                                  1.35,
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {preview}
                            </Typography>
                          )}

                          <Typography
                            sx={{
                              color:
                                "#475569",
                              fontSize:
                                "0.59rem",
                              mt: 0.25,
                            }}
                          >
                            {date ||
                              `${count} message${
                                count === 1
                                  ? ""
                                  : "s"
                              }`}
                          </Typography>
                        </Box>
                      }
                    />

                    <Tooltip title="Delete conversation">
                      <IconButton
                        size="small"
                        onClick={(event) =>
                          handleDeleteConversation(
                            event,
                            id
                          )
                        }
                        sx={{
                          color:
                            "#64748B",
                          flexShrink: 0,
                          mt: 0.2,

                          "&:hover": {
                            color:
                              "#FF5252",
                            bgcolor:
                              "rgba(255,82,82,0.08)",
                          },
                        }}
                      >
                        <DeleteOutlineIcon
                          fontSize="small"
                        />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                );
              }
            )}
          </List>
        )}
      </Box>

      {/* FOOTER */}

      <Box
        sx={{
          px: 1.5,
          py: 1.2,
          borderTop:
            "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            color: "#475569",
            fontSize: "0.62rem",
            textAlign: "center",
          }}
        >
          AI Cybersecurity Assistant
        </Typography>
      </Box>
    </Box>
  );
};

export default ConversationSidebar;