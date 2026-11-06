import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ClearIcon from "@mui/icons-material/Clear";

import API from "../services/api";

// ============================================================
// GET CONVERSATION ID
// ============================================================

const getConversationId = (conversation) => {
  return (
    conversation?._id ||
    conversation?.id ||
    null
  );
};

// ============================================================
// GET CONVERSATION DATE
// ============================================================

const getConversationDate = (conversation) => {
  if (!conversation) {
    return null;
  }

  return (
    conversation.updated_at ||
    conversation.updatedAt ||
    conversation.created_at ||
    conversation.createdAt ||
    conversation.timestamp ||
    null
  );
};

// ============================================================
// FORMAT CONVERSATION DATE
// ============================================================

const formatConversationDate = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  try {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

// ============================================================
// FORMAT CONVERSATION TIME
// ============================================================

const formatConversationTime = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  try {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

// ============================================================
// NORMALIZE DATE
// ============================================================

const normalizeDate = (date) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

// ============================================================
// GET DAY DIFFERENCE
// ============================================================

const getDayDifference = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  try {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const today = normalizeDate(
      new Date()
    );

    const targetDate = normalizeDate(
      date
    );

    const difference =
      today.getTime() -
      targetDate.getTime();

    return Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    );
  } catch {
    return null;
  }
};

// ============================================================
// GET CONVERSATION GROUP
// ============================================================

const getConversationGroup = (
  conversation
) => {
  const timestamp =
    getConversationDate(
      conversation
    );

  const difference =
    getDayDifference(
      timestamp
    );

  if (difference === 0) {
    return "Today";
  }

  if (difference === 1) {
    return "Yesterday";
  }

  if (
    difference !== null &&
    difference >= 2 &&
    difference <= 7
  ) {
    return "Previous 7 Days";
  }

  return "Older";
};

// ============================================================
// GET CONVERSATION TITLE
// ============================================================

const getConversationTitle = (
  conversation
) => {
  if (!conversation) {
    return "New Conversation";
  }

  const title =
    conversation.title ||
    conversation.name ||
    conversation.preview ||
    conversation.first_message ||
    "New Conversation";

  return (
    String(title).trim() ||
    "New Conversation"
  );
};

// ============================================================
// GET CONVERSATION PREVIEW
// ============================================================

const getConversationPreview = (
  conversation
) => {
  if (!conversation) {
    return "";
  }

  const preview =
    conversation.preview ||
    conversation.last_message ||
    conversation.lastMessage ||
    conversation.description ||
    "";

  return String(preview).trim();
};

// ============================================================
// GROUP CONVERSATIONS
// ============================================================

const groupConversations = (
  conversations
) => {
  const groups = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  conversations.forEach(
    (conversation) => {
      const group =
        getConversationGroup(
          conversation
        );

      groups[group].push(
        conversation
      );
    }
  );

  return groups;
};

// ============================================================
// CONVERSATION ITEM
// ============================================================

const ConversationItem = ({
  conversation,
  activeConversationId,
  loading,
  conversationsLoading,
  onSelectConversation,
  onMenuOpen,
}) => {
  const conversationId =
    getConversationId(
      conversation
    );

  const title =
    getConversationTitle(
      conversation
    );

  const preview =
    getConversationPreview(
      conversation
    );

  const timestamp =
    getConversationDate(
      conversation
    );

  const isActive =
    String(
      activeConversationId
    ) ===
    String(
      conversationId
    );

  return (
    <ListItemButton
      selected={isActive}
      onClick={() =>
        onSelectConversation(
          conversationId
        )
      }
      disabled={
        loading ||
        conversationsLoading
      }
      sx={{
        mx: 1,
        mb: 0.5,
        px: 1.5,
        py: 1.2,
        borderRadius: 2,
        alignItems: "flex-start",
        minWidth: 0,

        border: isActive
          ? "1px solid rgba(124,77,255,0.45)"
          : "1px solid transparent",

        bgcolor: isActive
          ? "rgba(124,77,255,0.16)"
          : "transparent",

        transition:
          "0.2s ease",

        "&:hover": {
          bgcolor:
            "rgba(255,255,255,0.06)",
        },

        "&.Mui-selected": {
          bgcolor:
            "rgba(124,77,255,0.18)",
        },

        "&.Mui-selected:hover": {
          bgcolor:
            "rgba(124,77,255,0.24)",
        },
      }}
    >
      {/* ====================================================
          CHAT ICON
      ==================================================== */}

      <Box
        sx={{
          pt: 0.3,
          mr: 1.2,
          color: isActive
            ? "#B388FF"
            : "#64748B",
        }}
      >
        <ChatBubbleOutlineIcon
          fontSize="small"
        />
      </Box>

      {/* ====================================================
          CONVERSATION TEXT
      ==================================================== */}

      <ListItemText
        primary={title}
        secondary={
          <Box
            component="span"
            sx={{
              display: "flex",
              flexDirection:
                "column",
              gap: 0.4,
              mt: 0.5,
              minWidth: 0,
            }}
          >
            {preview ? (
              <Typography
                component="span"
                sx={{
                  color: "#64748B",
                  fontSize:
                    "0.72rem",
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                  maxWidth: 190,
                  display: "block",
                }}
              >
                {preview}
              </Typography>
            ) : (
              <Typography
                component="span"
                sx={{
                  color: "#475569",
                  fontSize:
                    "0.7rem",
                }}
              >
                {formatConversationDate(
                  timestamp
                )}
              </Typography>
            )}

            {timestamp && (
              <Typography
                component="span"
                sx={{
                  color: "#475569",
                  fontSize:
                    "0.7rem",
                }}
              >
                {formatConversationTime(
                  timestamp
                )}
              </Typography>
            )}
          </Box>
        }
        primaryTypographyProps={{
          sx: {
            color: isActive
              ? "#FFFFFF"
              : "#E5E7EB",

            fontWeight: isActive
              ? 700
              : 500,

            fontSize:
              "0.9rem",

            overflow:
              "hidden",

            textOverflow:
              "ellipsis",

            whiteSpace:
              "nowrap",
          },
        }}
        sx={{
          m: 0,
          minWidth: 0,
        }}
      />

      {/* ====================================================
          MENU
      ==================================================== */}

      <Tooltip
        title="Conversation options"
      >
        <span>
          <IconButton
            size="small"
            onClick={(event) =>
              onMenuOpen(
                event,
                conversation
              )
            }
            disabled={
              loading ||
              conversationsLoading
            }
            sx={{
              ml: 0.5,
              color: "#64748B",

              "&:hover": {
                color: "#FFFFFF",
                bgcolor:
                  "rgba(255,255,255,0.08)",
              },
            }}
          >
            <MoreHorizIcon
              fontSize="small"
            />
          </IconButton>
        </span>
      </Tooltip>
    </ListItemButton>
  );
};

// ============================================================
// CONVERSATION SECTION
// ============================================================

const ConversationSection = ({
  title,
  conversations,
  activeConversationId,
  loading,
  conversationsLoading,
  onSelectConversation,
  onMenuOpen,
}) => {
  if (
    !conversations ||
    conversations.length === 0
  ) {
    return null;
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        sx={{
          px: 2,
          py: 1,
          color: "#64748B",
          fontSize:
            "0.72rem",
          fontWeight: 700,
          textTransform:
            "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {title}
      </Typography>

      <List disablePadding>
        {conversations.map(
          (
            conversation,
            index
          ) => (
            <ConversationItem
              key={
                getConversationId(
                  conversation
                ) ||
                `${title}-${index}`
              }
              conversation={
                conversation
              }
              activeConversationId={
                activeConversationId
              }
              loading={
                loading
              }
              conversationsLoading={
                conversationsLoading
              }
              onSelectConversation={
                onSelectConversation
              }
              onMenuOpen={
                onMenuOpen
              }
            />
          )
        )}
      </List>
    </Box>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const ConversationSidebar = ({
  open,
  onClose,

  // Parent controlled conversations
  conversations: externalConversations,

  activeConversationId,

  loading = false,
  conversationsLoading = false,

  // New chat callbacks
  onNewChat,
  onNewConversation,

  // Conversation callbacks
  onSelectConversation,
  onDeleteConversation,

  // Optional rename callback
  onRenameConversation,

  // Refresh support
  refreshKey,
}) => {
  // ==========================================================
  // LOCAL CONVERSATION STATE
  // ==========================================================

  const [
    conversations,
    setConversations,
  ] = useState(
    externalConversations || []
  );

  // ==========================================================
  // SEARCH
  // ==========================================================

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  // ==========================================================
  // LOCAL API LOADING
  // ==========================================================

  const [
    loadingLocal,
    setLoadingLocal,
  ] = useState(false);

  // ==========================================================
  // MENU STATE
  // ==========================================================

  const [
    anchorEl,
    setAnchorEl,
  ] = useState(null);

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(null);

  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  const loadConversations =
    async () => {
      try {
        setLoadingLocal(true);

        const response =
          await API.get(
            "/conversations"
          );

        const data =
          response.data;

        const conversationList =
          data?.conversations ||
          [];

        setConversations(
          conversationList
        );
      } catch (error) {
        console.error(
          "Load Conversations Error:",
          error
        );

        setConversations([]);
      } finally {
        setLoadingLocal(false);
      }
    };

  // ==========================================================
  // INITIAL LOAD / EXTERNAL DATA / REFRESH
  // ==========================================================

  useEffect(() => {
    if (
      externalConversations !==
      undefined
    ) {
      setConversations(
        externalConversations || []
      );

      return;
    }

    loadConversations();
  }, [
    refreshKey,
    externalConversations,
  ]);

  // ==========================================================
  // SEARCH FILTER
  // ==========================================================

  const filteredConversations =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

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

          const messagesText =
            Array.isArray(
              conversation?.messages
            )
              ? conversation.messages
                  .map(
                    (item) =>
                      String(
                        item?.content ||
                        item?.message ||
                        ""
                      )
                  )
                  .join(" ")
                  .toLowerCase()
              : "";

          return (
            title.includes(query) ||
            preview.includes(query) ||
            messagesText.includes(
              query
            )
          );
        }
      );
    }, [
      conversations,
      searchQuery,
    ]);

  // ==========================================================
  // GROUP CONVERSATIONS
  // ==========================================================

  const groupedConversations =
    useMemo(
      () =>
        groupConversations(
          filteredConversations
        ),
      [filteredConversations]
    );

  // ==========================================================
  // CLEAR SEARCH
  // ==========================================================

  const handleClearSearch =
    () => {
      setSearchQuery("");
    };

  // ==========================================================
  // NEW CHAT
  // ==========================================================

  const handleNewChat = () => {
    if (
      loading ||
      conversationsLoading ||
      loadingLocal
    ) {
      return;
    }

    setSearchQuery("");

    if (onNewChat) {
      onNewChat();
      return;
    }

    if (onNewConversation) {
      onNewConversation();
    }
  };

  // ==========================================================
  // SELECT CONVERSATION
  // ==========================================================

  const handleSelectConversation = (
    conversationId
  ) => {
    if (
      !conversationId ||
      loading ||
      conversationsLoading
    ) {
      return;
    }

    if (onSelectConversation) {
      onSelectConversation(
        conversationId
      );
    }
  };

  // ==========================================================
  // OPEN MENU
  // ==========================================================

  const handleMenuOpen = (
    event,
    conversation
  ) => {
    event.stopPropagation();

    setAnchorEl(
      event.currentTarget
    );

    setSelectedConversation(
      conversation
    );
  };

  // ==========================================================
  // CLOSE MENU
  // ==========================================================

  const handleMenuClose =
    () => {
      setAnchorEl(null);
      setSelectedConversation(
        null
      );
    };

  // ==========================================================
  // SELECTED CONVERSATION ID
  // ==========================================================

  const getSelectedConversationId =
    () => {
      if (
        !selectedConversation
      ) {
        return null;
      }

      return getConversationId(
        selectedConversation
      );
    };

  // ==========================================================
  // RENAME CONVERSATION
  // ==========================================================

  const handleRename =
    async () => {
      if (
        !selectedConversation ||
        loading ||
        conversationsLoading
      ) {
        return;
      }

      const conversationId =
        getSelectedConversationId();

      if (!conversationId) {
        handleMenuClose();
        return;
      }

      const currentTitle =
        getConversationTitle(
          selectedConversation
        );

      const newTitle =
        window.prompt(
          "Enter new conversation name:",
          currentTitle
        );

      if (
        !newTitle ||
        !newTitle.trim()
      ) {
        handleMenuClose();
        return;
      }

      try {
        if (
          onRenameConversation
        ) {
          await onRenameConversation(
            conversationId,
            newTitle.trim()
          );
        } else {
          await API.put(
            `/conversations/${conversationId}`,
            {
              title:
                newTitle.trim(),
            }
          );

          await loadConversations();
        }
      } catch (error) {
        console.error(
          "Rename Conversation Error:",
          error
        );
      } finally {
        handleMenuClose();
      }
    };

  // ==========================================================
  // DELETE CONVERSATION
  // ==========================================================

  const handleDelete =
    async () => {
      if (
        !selectedConversation ||
        loading ||
        conversationsLoading
      ) {
        return;
      }

      const conversationId =
        getSelectedConversationId();

      if (!conversationId) {
        handleMenuClose();
        return;
      }

      const title =
        getConversationTitle(
          selectedConversation
        );

      const confirmed =
        window.confirm(
          `Delete "${title}"?`
        );

      if (!confirmed) {
        handleMenuClose();
        return;
      }

      try {
        if (
          onDeleteConversation
        ) {
          await onDeleteConversation(
            conversationId
          );
        } else {
          await API.delete(
            `/conversations/${conversationId}`
          );
        }

        // Remove immediately from local list
        setConversations(
          (previous) =>
            previous.filter(
              (conversation) =>
                String(
                  getConversationId(
                    conversation
                  )
                ) !==
                String(
                  conversationId
                )
            )
        );

        // If deleted conversation is active
        if (
          String(
            activeConversationId
          ) ===
          String(
            conversationId
          )
        ) {
          if (onNewChat) {
            onNewChat();
          } else if (
            onNewConversation
          ) {
            onNewConversation();
          }
        }

        // Reload only when parent
        // is not controlling delete
        if (
          !onDeleteConversation
        ) {
          await loadConversations();
        }
      } catch (error) {
        console.error(
          "Delete Conversation Error:",
          error
        );
      } finally {
        handleMenuClose();
      }
    };

  // ==========================================================
  // RENDER GROUP
  // ==========================================================

  const renderGroup = (
    title,
    items
  ) => {
    if (
      !items ||
      items.length === 0
    ) {
      return null;
    }

    return (
      <ConversationSection
        key={title}
        title={title}
        conversations={items}
        activeConversationId={
          activeConversationId
        }
        loading={loading}
        conversationsLoading={
          conversationsLoading
        }
        onSelectConversation={
          handleSelectConversation
        }
        onMenuOpen={
          handleMenuOpen
        }
      />
    );
  };

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <Box
      sx={{
        width: 340,
        height: "100%",
        minHeight: "100vh",

        bgcolor: "#111827",
        color: "#FFFFFF",

        display: "flex",
        flexDirection: "column",

        overflow: "hidden",

        borderRight:
          "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <Box
        sx={{
          px: 2,
          py: 2,

          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <HistoryIcon
            sx={{
              color: "#00E5FF",
            }}
          />

          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize:
                  "1.05rem",
              }}
            >
              Conversations
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "#64748B",
              }}
            >
              {conversations.length}{" "}
              saved conversations
            </Typography>
          </Box>
        </Box>

        {onClose && (
          <Tooltip title="Close">
            <IconButton
              onClick={onClose}
              sx={{
                color: "#94A3B8",

                "&:hover": {
                  color:
                    "#FFFFFF",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider
        sx={{
          borderColor:
            "rgba(255,255,255,0.08)",
        }}
      />

      {/* ====================================================
          NEW CHAT
      ==================================================== */}

      <Box
        sx={{
          p: 1.5,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          startIcon={
            <AddIcon />
          }
          onClick={
            handleNewChat
          }
          disabled={
            loading ||
            conversationsLoading ||
            loadingLocal
          }
          sx={{
            py: 1.1,
            borderRadius: 2,

            bgcolor:
              "#7C4DFF",
            color: "#FFFFFF",

            fontWeight: 700,
            textTransform:
              "none",

            "&:hover": {
              bgcolor:
                "#651FFF",
            },

            "&.Mui-disabled": {
              bgcolor:
                "#374151",
            },
          }}
        >
          New Chat
        </Button>
      </Box>

      {/* ====================================================
          SEARCH
      ==================================================== */}

      <Box
        sx={{
          px: 1.5,
          pb: 1.5,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={
            searchQuery
          }
          onChange={(
            event
          ) =>
            setSearchQuery(
              event.target.value
            )
          }
          InputProps={{
            startAdornment: (
              <InputAdornment
                position="start"
              >
                <SearchIcon
                  sx={{
                    color:
                      "#64748B",
                    fontSize: 20,
                  }}
                />
              </InputAdornment>
            ),

            endAdornment:
              searchQuery ? (
                <InputAdornment
                  position="end"
                >
                  <IconButton
                    size="small"
                    onClick={
                      handleClearSearch
                    }
                    sx={{
                      color:
                        "#64748B",
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
          }}
          sx={{
            "& .MuiOutlinedInput-root":
              {
                color:
                  "#FFFFFF",

                bgcolor:
                  "#1d263b",

                borderRadius: 2,

                "& fieldset": {
                  borderColor:
                    "rgba(255,255,255,0.1)",
                },

                "&:hover fieldset":
                  {
                    borderColor:
                      "rgba(0,229,255,0.4)",
                  },

                "&.Mui-focused fieldset":
                  {
                    borderColor:
                      "#00E5FF",
                  },
              },

            "& .MuiInputBase-input::placeholder":
              {
                color:
                  "#64748B",
                opacity: 1,
              },
          }}
        />
      </Box>

      <Divider
        sx={{
          borderColor:
            "rgba(255,255,255,0.08)",
        }}
      />

      {/* ====================================================
          CONVERSATION LIST
      ==================================================== */}

      <Box
        sx={{
          flex: 1,
          overflowY:
            "auto",
          py: 1,

          "&::-webkit-scrollbar":
            {
              width: 5,
            },

          "&::-webkit-scrollbar-thumb":
            {
              bgcolor:
                "#334155",
              borderRadius: 5,
            },
        }}
      >
        {(
          conversationsLoading ||
          loadingLocal
        ) ? (
          <Box
            sx={{
              display: "flex",
              flexDirection:
                "column",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 1.5,
              py: 5,
            }}
          >
            <CircularProgress
              size={28}
              sx={{
                color:
                  "#7C4DFF",
              }}
            />

            <Typography
              variant="body2"
              sx={{
                color:
                  "#64748B",
              }}
            >
              Loading conversations...
            </Typography>
          </Box>
        ) : filteredConversations.length ===
          0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection:
                "column",
              alignItems:
                "center",
              justifyContent:
                "center",
              textAlign:
                "center",
              px: 3,
              py: 6,
              gap: 1.5,
            }}
          >
            <ChatBubbleOutlineIcon
              sx={{
                fontSize: 36,
                color:
                  "#475569",
              }}
            />

            <Typography
              sx={{
                color:
                  "#94A3B8",
              }}
            >
              {searchQuery
                ? "No matching conversations found."
                : "No conversations yet."}
            </Typography>

            {searchQuery && (
              <Button
                size="small"
                onClick={
                  handleClearSearch
                }
                sx={{
                  color:
                    "#00E5FF",
                  textTransform:
                    "none",
                }}
              >
                Clear Search
              </Button>
            )}
          </Box>
        ) : (
          <>
            {renderGroup(
              "Today",
              groupedConversations.Today
            )}

            {renderGroup(
              "Yesterday",
              groupedConversations.Yesterday
            )}

            {renderGroup(
              "Previous 7 Days",
              groupedConversations[
                "Previous 7 Days"
              ]
            )}

            {renderGroup(
              "Older",
              groupedConversations.Older
            )}
          </>
        )}
      </Box>

      {/* ====================================================
          FOOTER
      ==================================================== */}

      <Divider
        sx={{
          borderColor:
            "rgba(255,255,255,0.08)",
        }}
      />

      <Box
        sx={{
          px: 2,
          py: 1.5,

          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "#64748B",
          }}
        >
          {
            filteredConversations.length
          }{" "}
          Conversation
          {filteredConversations.length !==
          1
            ? "s"
            : ""}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: "#475569",
          }}
        >
          AI Security
        </Typography>
      </Box>

      {/* ====================================================
          CONVERSATION MENU
      ==================================================== */}

      <Menu
        anchorEl={
          anchorEl
        }
        open={Boolean(
          anchorEl
        )}
        onClose={
          handleMenuClose
        }
        PaperProps={{
          sx: {
            bgcolor:
              "#1E293B",
            color:
              "#FFFFFF",

            border:
              "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
        <MenuItem
          onClick={
            handleRename
          }
        >
          <EditIcon
            fontSize="small"
            sx={{
              mr: 1,
            }}
          />

          Rename
        </MenuItem>

        <Divider
          sx={{
            borderColor:
              "rgba(255,255,255,0.1)",
          }}
        />

        <MenuItem
          onClick={
            handleDelete
          }
          sx={{
            color:
              "#FF5252",

            "&:hover": {
              bgcolor:
                "rgba(255,82,82,0.08)",
            },
          }}
        >
          <DeleteOutlineIcon
            fontSize="small"
            sx={{
              mr: 1,
            }}
          />

          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ConversationSidebar;