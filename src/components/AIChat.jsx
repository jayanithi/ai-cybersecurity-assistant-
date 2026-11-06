import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Divider,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Drawer,
  InputAdornment,
} from "@mui/material";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  getAIChatContext,
  clearAIChatContext,
} from "../utils/aiChatContext";

import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import CodeIcon from "@mui/icons-material/Code";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

import Layout from "../components/Layout";
import API from "../services/api";


// ============================================================
// STORAGE KEYS
// ============================================================

const CHAT_STORAGE_KEY =
  "ai_cybersecurity_chat_history";

const SCAN_CONTEXT_STORAGE_KEY =
  "latest_scan_context";

const SELECTED_VULNERABILITY_STORAGE_KEY =
  "selected_vulnerability_context";


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_HISTORY_MESSAGES = 100;

const AI_HISTORY_LIMIT = 10;


// ============================================================
// FORMAT TIME
// ============================================================

const formatTime = (timestamp) => {
  if (!timestamp) {
    return "";
  }

  try {
    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
};


// ============================================================
// FORMAT CONVERSATION DATE
// ============================================================

const formatConversationDate = (
  timestamp
) => {
  if (!timestamp) {
    return "";
  }

  try {
    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const today =
      new Date();

    const isToday =
      date.toDateString() ===
      today.toDateString();

    if (isToday) {
      return formatTime(timestamp);
    }

    return date.toLocaleDateString(
      [],
      {
        month: "short",
        day: "numeric",
      }
    );
  } catch {
    return "";
  }
};


// ============================================================
// LOAD FROM STORAGE
// ============================================================

const loadFromStorage = (
  key
) => {
  try {
    const storedData =
      localStorage.getItem(key);

    if (!storedData) {
      return null;
    }

    return JSON.parse(
      storedData
    );
  } catch (error) {
    console.error(
      `Failed to load ${key}:`,
      error
    );

    return null;
  }
};


// ============================================================
// SAVE TO STORAGE
// ============================================================

const saveToStorage = (
  key,
  data
) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(
      `Failed to save ${key}:`,
      error
    );
  }
};


// ============================================================
// REMOVE FROM STORAGE
// ============================================================

const removeFromStorage = (
  key
) => {
  try {
    localStorage.removeItem(
      key
    );
  } catch (error) {
    console.error(
      `Failed to remove ${key}:`,
      error
    );
  }
};


// ============================================================
// LOAD LOCAL CHAT HISTORY
// ============================================================

const loadChatHistory = () => {
  try {
    const storedHistory =
      localStorage.getItem(
        CHAT_STORAGE_KEY
      );

    if (!storedHistory) {
      return [];
    }

    const parsedHistory =
      JSON.parse(
        storedHistory
      );

    if (
      !Array.isArray(
        parsedHistory
      )
    ) {
      return [];
    }

    return parsedHistory.filter(
      (item) =>
        item &&
        (
          item.role === "user" ||
          item.role === "assistant"
        ) &&
        typeof item.content === "string"
    );
  } catch (error) {
    console.error(
      "Failed to load chat history:",
      error
    );

    return [];
  }
};


// ============================================================
// SAVE LOCAL CHAT HISTORY
// ============================================================

const saveChatHistory = (
  messages
) => {
  try {
    const limitedMessages =
      messages.slice(
        -MAX_HISTORY_MESSAGES
      );

    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(
        limitedMessages
      )
    );
  } catch (error) {
    console.error(
      "Failed to save chat history:",
      error
    );
  }
};


// ============================================================
// CREATE WELCOME MESSAGE
// ============================================================

const createWelcomeMessage = (
  content =
    "Hello! I am your AI Cybersecurity Assistant. " +
    "Ask me about vulnerabilities, secure coding, " +
    "OWASP, SQL Injection, XSS, authentication, " +
    "API security, or your scan results."
) => {
  return {
    id:
      `assistant-${Date.now()}`,

    role:
      "assistant",

    content,

    timestamp:
      new Date().toISOString(),
  };
};


// ============================================================
// GET VULNERABILITY NAME
// ============================================================

const getVulnerabilityName = (
  vulnerability
) => {
  if (!vulnerability) {
    return "Unknown Vulnerability";
  }

  return (
    vulnerability.type ||
    vulnerability.name ||
    vulnerability.title ||
    vulnerability.vulnerability ||
    "Unknown Vulnerability"
  );
};


// ============================================================
// GET SEVERITY COLOR
// ============================================================

const getSeverityColor = (
  severity
) => {
  const value =
    String(
      severity || ""
    ).toLowerCase();

  if (
    value === "critical" ||
    value === "high"
  ) {
    return "error";
  }

  if (
    value === "medium"
  ) {
    return "warning";
  }

  return "success";
};


// ============================================================
// NORMALIZE BACKEND MESSAGE
// ============================================================

const normalizeMessage = (
  item,
  index
) => {
  if (!item) {
    return null;
  }

  const role =
    item.role === "assistant" ||
    item.role === "user"
      ? item.role
      : null;

  if (!role) {
    return null;
  }

  return {
    id:
      item._id ||
      item.id ||
      `${role}-${Date.now()}-${index}`,

    role,

    content:
      String(
        item.content ||
        item.message ||
        ""
      ),

    timestamp:
      item.timestamp ||
      item.created_at ||
      item.createdAt ||
      new Date().toISOString(),

    metadata:
      item.metadata || {},
  };
};


// ============================================================
// AI CHAT COMPONENT
// ============================================================

const AIChat = () => {

  // ==========================================================
  // LOCATION
  // ==========================================================

  const location =
    useLocation();

  const navigate =
    useNavigate();


  // ==========================================================
  // CONVERSATION STATE
  // ==========================================================

  const [
    conversationId,
    setConversationId,
  ] = useState(null);

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(null);

  const [
    conversationRefreshKey,
    setConversationRefreshKey,
  ] = useState(0);

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    conversationsLoading,
    setConversationsLoading,
  ] = useState(false);


  // ==========================================================
  // SEARCH STATE
  // ==========================================================

  const [
    conversationSearch,
    setConversationSearch,
  ] = useState("");


  // ==========================================================
  // CHAT STATE
  // ==========================================================

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // SCAN CONTEXT
  // ==========================================================

  const [
    scanContext,
    setScanContext,
  ] = useState(null);


  // ==========================================================
  // SELECTED VULNERABILITY
  // ==========================================================

  const [
    selectedVulnerability,
    setSelectedVulnerability,
  ] = useState(null);


  // ==========================================================
  // UI STATE
  // ==========================================================

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);


  // ==========================================================
  // REFS
  // ==========================================================

  const chatEndRef =
    useRef(null);

  const contextInitializedRef =
    useRef(false);


  // ==========================================================
  // NAVIGATE
  // ==========================================================

  // Kept intentionally so existing routing behavior is preserved.
  // Remove this line only if navigation is not used elsewhere.
  void navigate;


  // ==========================================================
  // QUICK QUESTIONS
  // ==========================================================

  const quickQuestions = [
    "What is SQL Injection?",
    "How can I prevent XSS?",
    "Explain OWASP Top 10",
    "What is the most dangerous vulnerability in my latest scan?",
    "How can I securely fix the vulnerabilities detected in my code?",
  ];


  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  const loadConversations =
    async () => {

      try {
        setConversationsLoading(
          true
        );

        const response =
          await API.get(
            "/conversations"
          );

        const loadedConversations =
          response.data?.conversations ||
          [];

        setConversations(
          Array.isArray(
            loadedConversations
          )
            ? loadedConversations
            : []
        );

      } catch (error) {

        console.error(
          "Conversation Load Error:",
          error
        );

        setConversations([]);

      } finally {

        setConversationsLoading(
          false
        );

      }
    };


  // ==========================================================
  // FILTER CONVERSATIONS
  // ==========================================================

  const filteredConversations =
    conversations.filter(
      (
        conversation
      ) => {

        const searchValue =
          conversationSearch
            .trim()
            .toLowerCase();

        if (!searchValue) {
          return true;
        }

        const title =
          String(
            conversation.title ||
            ""
          ).toLowerCase();

        const preview =
          String(
            conversation.preview ||
            conversation.last_message ||
            conversation.lastMessage ||
            ""
          ).toLowerCase();

        const messagesText =
          Array.isArray(
            conversation.messages
          )
            ? conversation.messages
                .map(
                  (
                    item
                  ) =>
                    String(
                      item.content ||
                      item.message ||
                      ""
                    )
                )
                .join(" ")
                .toLowerCase()
            : "";

        return (
          title.includes(
            searchValue
          ) ||
          preview.includes(
            searchValue
          ) ||
          messagesText.includes(
            searchValue
          )
        );
      }
    );


  // ==========================================================
  // INITIAL CONVERSATION LOAD
  // ==========================================================

  useEffect(() => {

    loadConversations();

  }, [
    conversationRefreshKey,
  ]);


  // ==========================================================
  // LOAD LOCAL CHAT HISTORY
  // ==========================================================

  useEffect(() => {

    const savedMessages =
      loadChatHistory();

    if (
      savedMessages.length > 0
    ) {

      setMessages(
        savedMessages
      );

      return;
    }

    const welcomeMessage =
      createWelcomeMessage();

    setMessages([
      welcomeMessage,
    ]);

    saveChatHistory([
      welcomeMessage,
    ]);

  }, []);


  // ==========================================================
  // LOAD SCANNER CONTEXT
  // ==========================================================

  useEffect(() => {

    if (
      contextInitializedRef.current
    ) {
      return;
    }

    contextInitializedRef.current =
      true;

    const navigationScanContext =
      location.state?.scanContext;

    const navigationSelectedVulnerability =
      location.state?.selectedVulnerability;

    const initialQuestion =
      location.state?.initialQuestion ||
      location.state?.autoQuestion;

    let finalScanContext =
      navigationScanContext ||
      null;

    let utilityContext =
      null;

    if (!finalScanContext) {

      try {

        utilityContext =
          getAIChatContext();

        if (utilityContext) {
          finalScanContext =
            utilityContext;
        }

      } catch (contextError) {

        console.error(
          "Failed to load AI chat context:",
          contextError
        );

      }
    }

    if (!finalScanContext) {

      finalScanContext =
        loadFromStorage(
          SCAN_CONTEXT_STORAGE_KEY
        );

    }

    const finalSelectedVulnerability =
      navigationSelectedVulnerability ||
      utilityContext?.selectedVulnerability ||
      finalScanContext?.selectedVulnerability ||
      loadFromStorage(
        SELECTED_VULNERABILITY_STORAGE_KEY
      ) ||
      null;

    if (
      finalScanContext
    ) {

      setScanContext(
        finalScanContext
      );

      saveToStorage(
        SCAN_CONTEXT_STORAGE_KEY,
        finalScanContext
      );

    }

    if (
      finalSelectedVulnerability
    ) {

      setSelectedVulnerability(
        finalSelectedVulnerability
      );

      saveToStorage(
        SELECTED_VULNERABILITY_STORAGE_KEY,
        finalSelectedVulnerability
      );

    }

    if (
      initialQuestion
    ) {

      setMessage(
        initialQuestion
      );

    }

  }, [
    location.state,
  ]);


  // ==========================================================
  // SAVE LOCAL CHAT HISTORY
  // ==========================================================

  useEffect(() => {

    if (
      messages.length > 0
    ) {

      saveChatHistory(
        messages
      );

    }

  }, [
    messages,
  ]);


  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {

    chatEndRef.current
      ?.scrollIntoView({
        behavior:
          "smooth",
      });

  }, [
    messages,
    loading,
  ]);


  // ==========================================================
  // OPEN EXISTING CONVERSATION
  // ==========================================================

  const handleOpenConversation =
    async (
      id
    ) => {

      if (
        !id ||
        loading
      ) {
        return;
      }

      try {

        setError("");

        const response =
          await API.get(
            `/conversations/${id}`
          );

        const conversation =
          response.data?.conversation;

        if (!conversation) {
          throw new Error(
            "Conversation not found."
          );
        }

        const actualConversationId =
          conversation._id ||
          conversation.id ||
          id;

        const backendMessages =
          Array.isArray(
            conversation.messages
          )
            ? conversation.messages
                .map(
                  normalizeMessage
                )
                .filter(
                  Boolean
                )
            : [];

        setConversationId(
          actualConversationId
        );

        setActiveConversationId(
          actualConversationId
        );

        setMessages(
          backendMessages.length > 0
            ? backendMessages
            : [
                createWelcomeMessage(
                  "Conversation opened. How can I help you?"
                ),
              ]
        );

        if (
          conversation.scan_context
        ) {

          setScanContext(
            conversation.scan_context
          );

          saveToStorage(
            SCAN_CONTEXT_STORAGE_KEY,
            conversation.scan_context
          );

        } else {

          setScanContext(
            null
          );

        }

        if (
          conversation.vulnerability_context
        ) {

          setSelectedVulnerability(
            conversation.vulnerability_context
          );

          saveToStorage(
            SELECTED_VULNERABILITY_STORAGE_KEY,
            conversation.vulnerability_context
          );

        } else {

          setSelectedVulnerability(
            null
          );

        }

        setHistoryOpen(
          false
        );

      } catch (error) {

        console.error(
          "Load Conversation Error:",
          error
        );

        setError(
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load conversation"
        );

      }
    };


  // ==========================================================
  // SELECT CONVERSATION
  // ==========================================================

  const handleSelectConversation =
    async (
      selectedConversationId
    ) => {

      await handleOpenConversation(
        selectedConversationId
      );

    };


  // ==========================================================
  // NEW CONVERSATION
  // ==========================================================

  const handleNewConversation =
    () => {

      setConversationId(
        null
      );

      setActiveConversationId(
        null
      );

      setMessages([
        createWelcomeMessage(
          "Hello! I am your AI Cybersecurity Assistant. How can I help you today?"
        ),
      ]);

      setScanContext(
        null
      );

      setSelectedVulnerability(
        null
      );

      setMessage(
        ""
      );

      setError(
        ""
      );

      setConversationSearch(
        ""
      );

      setHistoryOpen(
        false
      );

    };


  // ==========================================================
  // NEW CHAT
  // ==========================================================

  const handleNewChat =
    () => {

      if (
        loading
      ) {
        return;
      }

      handleNewConversation();

    };


  // ==========================================================
  // DELETE CONVERSATION
  // ==========================================================

  const handleDeleteConversation =
    async (
      conversationIdToDelete
    ) => {

      if (
        !conversationIdToDelete ||
        loading
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this conversation?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {

        setError("");

        await API.delete(
          `/conversations/${conversationIdToDelete}`
        );

        if (
          String(
            conversationId
          ) ===
          String(
            conversationIdToDelete
          )
        ) {

          setConversationId(
            null
          );

          setActiveConversationId(
            null
          );

          setMessages([
            createWelcomeMessage(
              "Conversation deleted. How can I help you?"
            ),
          ]);

          setScanContext(
            null
          );

          setSelectedVulnerability(
            null
          );

        }

        setConversations(
          (
            previous
          ) =>
            previous.filter(
              (
                conversation
              ) =>
                String(
                  conversation._id ||
                  conversation.id
                ) !==
                String(
                  conversationIdToDelete
                )
            )
        );

      } catch (error) {

        console.error(
          "Delete Conversation Error:",
          error
        );

        setError(
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to delete conversation."
        );

      }
    };


  // ==========================================================
  // BUILD CHAT HISTORY
  // ==========================================================

  const buildChatHistory =
    (
      sourceMessages
    ) => {

      return sourceMessages
        .filter(
          (
            item
          ) =>
            item &&
            (
              item.role === "user" ||
              item.role === "assistant"
            )
        )
        .map(
          (
            item
          ) => ({
            role:
              item.role,

            content:
              String(
                item.content ||
                ""
              ),
          })
        )
        .filter(
          (
            item
          ) =>
            item.content
              .trim() !== ""
        )
        .slice(
          -AI_HISTORY_LIMIT
        );
    };


  // ==========================================================
  // NORMALIZE VULNERABILITY
  // ==========================================================

  const normalizeVulnerability =
    (
      vulnerability
    ) => {

      if (
        !vulnerability ||
        typeof vulnerability !==
          "object"
      ) {
        return null;
      }

      return {
        type:
          vulnerability.type ||
          vulnerability.name ||
          vulnerability.vulnerability ||
          vulnerability.title ||
          "Unknown Vulnerability",

        severity:
          vulnerability.severity ||
          "Unknown",

        description:
          vulnerability.description ||
          vulnerability.message ||
          "No description available.",

        line:
          vulnerability.line ??
          vulnerability.lineNumber ??
          "Unknown",

        cwe:
          vulnerability.cwe ||
          vulnerability.CWE ||
          vulnerability.cwe_id ||
          "Not specified",

        id:
          vulnerability.id ||
          vulnerability._id ||
          null,

        language:
          vulnerability.language ||
          null,
      };
    };


  // ==========================================================
  // BUILD REQUEST SCAN CONTEXT
  // ==========================================================

  const buildRequestScanContext =
    (
      context
    ) => {

      if (
        !context ||
        typeof context !==
          "object"
      ) {
        return null;
      }

      return {
        language:
          context.language ||
          null,

        status:
          context.status ||
          null,

        riskScore:
          context.riskScore ??
          context.risk_score ??
          0,

        totalIssues:
          context.totalIssues ??
          context.total_issues ??
          (
            Array.isArray(
              context.vulnerabilities
            )
              ? context.vulnerabilities.length
              : 0
          ),

        grade:
          context.grade ||
          context.securityGrade ||
          context.security_grade ||
          null,

        selectedVulnerability:
          normalizeVulnerability(
            context.selectedVulnerability
          ),

        vulnerabilities:
          Array.isArray(
            context.vulnerabilities
          )
            ? context.vulnerabilities
            : [],
      };
    };


  // ==========================================================
  // CREATE AI CONTEXT
  // ==========================================================

  const createAIContext =
    (
      contextOverride = null
    ) => {

      const effectiveContext =
        contextOverride ||
        scanContext ||
        {};

      const requestScanContext =
        buildRequestScanContext(
          effectiveContext
        );

      if (
        selectedVulnerability &&
        requestScanContext
      ) {

        requestScanContext.selectedVulnerability =
          normalizeVulnerability(
            selectedVulnerability
          );

      }

      return {
        scan_context:
          requestScanContext ||
          null,

        selected_vulnerability:
          normalizeVulnerability(
            selectedVulnerability ||
            effectiveContext?.selectedVulnerability ||
            null
          ),
      };
    };


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage =
    async (
      text = message,
      isRetry = false,
      contextOverride = null
    ) => {

      const cleanMessage =
        String(
          text || ""
        ).trim();

      if (
        !cleanMessage ||
        loading
      ) {
        return;
      }

      try {

        setError("");

        setLoading(
          true
        );

        const effectiveScanContext =
          contextOverride ||
          scanContext ||
          null;

        let chatHistory =
          buildChatHistory(
            messages
          );

        // ------------------------------------------------------
        // RETRY LOGIC
        // ------------------------------------------------------

        if (
          isRetry
        ) {

          const lastUserIndex =
            [
              ...messages,
            ]
              .map(
                (
                  item,
                  index
                ) => ({
                  ...item,
                  index,
                })
              )
              .reverse()
              .find(
                (
                  item
                ) =>
                  item.role ===
                    "user" &&
                  item.content ===
                    cleanMessage
              );

          if (
            lastUserIndex
          ) {

            chatHistory =
              buildChatHistory(
                messages.slice(
                  0,
                  lastUserIndex.index
                )
              );

          }
        }

        const lastHistoryItem =
          chatHistory[
            chatHistory.length - 1
          ];

        if (
          !lastHistoryItem ||
          lastHistoryItem.role !==
            "user" ||
          lastHistoryItem.content !==
            cleanMessage
        ) {

          chatHistory.push({
            role:
              "user",

            content:
              cleanMessage,
          });

        }

        chatHistory =
          chatHistory.slice(
            -AI_HISTORY_LIMIT
          );


        // ------------------------------------------------------
        // ADD USER MESSAGE
        // ------------------------------------------------------

        if (
          !isRetry
        ) {

          const userMessage = {
            id:
              `user-${Date.now()}`,

            role:
              "user",

            content:
              cleanMessage,

            timestamp:
              new Date()
                .toISOString(),
          };

          setMessages(
            (
              previousMessages
            ) => [
              ...previousMessages,
              userMessage,
            ]
          );

        }

        setMessage(
          ""
        );


        // ------------------------------------------------------
        // BUILD AI CONTEXT
        // ------------------------------------------------------

        const aiContext =
          createAIContext(
            effectiveScanContext
          );


        // ------------------------------------------------------
        // CONVERSATION ID
        // ------------------------------------------------------

        const requestConversationId =
          conversationId ||
          activeConversationId ||
          null;


        // ------------------------------------------------------
        // AUTH TOKEN
        // ------------------------------------------------------

        const token =
          localStorage.getItem(
            "token"
          ) ||
          localStorage.getItem(
            "access_token"
          );


        // ------------------------------------------------------
        // AI CHAT REQUEST
        // ------------------------------------------------------

        const response =
          await API.post(
            "/ai/chat",
            {
              message:
                cleanMessage,

              conversation_id:
                requestConversationId,

              chat_history:
                chatHistory,

              scan_context:
                aiContext.scan_context,

              vulnerability_context:
                aiContext.selected_vulnerability,

              selected_vulnerability:
                aiContext.selected_vulnerability,
            },
            token
              ? {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              : undefined
          );


        const responseData =
          response.data;


        // ------------------------------------------------------
        // BACKEND FAILURE
        // ------------------------------------------------------

        if (
          responseData?.success ===
          false
        ) {

          throw new Error(
            responseData?.message ||
            responseData?.error ||
            "AI failed to generate a response."
          );

        }


        // ------------------------------------------------------
        // CONVERSATION ID FROM BACKEND
        // ------------------------------------------------------

        const returnedConversationId =
          responseData?.conversation_id ||
          responseData?.conversationId ||
          null;

        if (
          returnedConversationId
        ) {

          setConversationId(
            returnedConversationId
          );

          setActiveConversationId(
            returnedConversationId
          );

        }


        // ------------------------------------------------------
        // AI RESPONSE
        // ------------------------------------------------------

        const aiResponse =
          responseData?.response ||
          responseData?.answer ||
          responseData?.message ||
          responseData?.chat ||
          responseData?.reply ||
          responseData?.content ||
          "";

        if (
          !String(
            aiResponse
          ).trim()
        ) {

          throw new Error(
            "AI did not return a response."
          );

        }


        // ------------------------------------------------------
        // ADD ASSISTANT MESSAGE
        // ------------------------------------------------------

        const assistantMessage = {
          id:
            `assistant-${Date.now()}`,

          role:
            "assistant",

          content:
            String(
              aiResponse
            ).trim(),

          timestamp:
            new Date()
              .toISOString(),
        };

        setMessages(
          (
            previousMessages
          ) => [
            ...previousMessages,
            assistantMessage,
          ]
        );


        // ------------------------------------------------------
        // REFRESH HISTORY
        // ------------------------------------------------------

        setConversationRefreshKey(
          (
            previous
          ) =>
            previous + 1
        );

      } catch (err) {

        console.error(
          "AI Chat Error:",
          err
        );

        const errorMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to communicate with the AI assistant.";

        setError(
          errorMessage
        );

      } finally {

        setLoading(
          false
        );

      }
    };


  // ==========================================================
  // RETRY LAST MESSAGE
  // ==========================================================

  const handleRetry =
    async () => {

      if (
        loading
      ) {
        return;
      }

      const lastUserMessage =
        [
          ...messages,
        ]
          .reverse()
          .find(
            (
              item
            ) =>
              item.role ===
              "user"
          );

      if (
        !lastUserMessage
      ) {
        return;
      }

      await sendMessage(
        lastUserMessage.content,
        true
      );
    };


  // ==========================================================
  // CLEAR CHAT
  // ==========================================================

  const handleClearChat =
    () => {

      if (
        loading
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to clear the current chat history?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      removeFromStorage(
        CHAT_STORAGE_KEY
      );

      const welcomeMessage =
        createWelcomeMessage(
          "Chat history cleared. How can I help you with cybersecurity today?"
        );

      setConversationId(
        null
      );

      setActiveConversationId(
        null
      );

      setMessages([
        welcomeMessage,
      ]);

      setMessage(
        ""
      );

      setError(
        ""
      );

      saveChatHistory([
        welcomeMessage,
      ]);
    };


  // ==========================================================
  // CLEAR SCAN CONTEXT
  // ==========================================================

  const handleClearScanContext =
    () => {

      removeFromStorage(
        SCAN_CONTEXT_STORAGE_KEY
      );

      removeFromStorage(
        SELECTED_VULNERABILITY_STORAGE_KEY
      );

      try {

        clearAIChatContext();

      } catch (
        contextError
      ) {

        console.error(
          "Failed to clear AI chat context:",
          contextError
        );

      }

      setScanContext(
        null
      );

      setSelectedVulnerability(
        null
      );
    };


  // ==========================================================
  // CLEAR SELECTED VULNERABILITY
  // ==========================================================

  const handleClearSelectedVulnerability =
    () => {

      removeFromStorage(
        SELECTED_VULNERABILITY_STORAGE_KEY
      );

      setSelectedVulnerability(
        null
      );
    };


  // ==========================================================
  // CLEAR INPUT
  // ==========================================================

  const handleClearInput =
    () => {

      setMessage(
        ""
      );
    };


  // ==========================================================
  // ENTER KEY
  // ==========================================================

  const handleKeyDown =
    (
      event
    ) => {

      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();

      }
    };


  // ==========================================================
  // VULNERABILITY VALUES
  // ==========================================================

  const vulnerabilityName =
    getVulnerabilityName(
      selectedVulnerability
    );

  const vulnerabilitySeverity =
    selectedVulnerability?.severity ||
    "Unknown";


  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <Layout>

      <Box
        sx={{
          minHeight:
            "calc(100vh - 64px)",

          bgcolor:
            "#070D1A",

          color:
            "#fff",

          px: {
            xs: 1,
            sm: 2,
            md: 3,
          },

          py: {
            xs: 1.5,
            sm: 2,
            md: 3,
          },
        }}
      >

        {/* ====================================================
            HISTORY DRAWER
        ==================================================== */}

        <Drawer
          anchor="left"
          open={historyOpen}
          onClose={() =>
            setHistoryOpen(false)
          }
        >

          <Box
            sx={{
              width: {
                xs: "88vw",
                sm: 360,
              },

              maxWidth:
                380,

              height:
                "100%",

              bgcolor:
                "#0B1220",

              color:
                "#fff",

              display:
                "flex",

              flexDirection:
                "column",
            }}
          >

            {/* DRAWER HEADER */}

            <Box
              sx={{
                p: 2.2,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                borderBottom:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    1.2,
                }}
              >

                <Avatar
                  sx={{
                    width:
                      38,

                    height:
                      38,

                    bgcolor:
                      "rgba(0,229,255,0.12)",

                    color:
                      "#00E5FF",
                  }}
                >
                  <HistoryIcon
                    fontSize="small"
                  />
                </Avatar>

                <Box>

                  <Typography
                    sx={{
                      fontWeight:
                        800,

                      fontSize:
                        "0.98rem",
                    }}
                  >
                    Chat History
                  </Typography>

                  <Typography
                    sx={{
                      color:
                        "#64748B",

                      fontSize:
                        "0.72rem",
                    }}
                  >
                    {
                      conversations.length
                    } saved conversations
                  </Typography>

                </Box>

              </Box>


              <IconButton
                onClick={() =>
                  setHistoryOpen(
                    false
                  )
                }
                sx={{
                  color:
                    "#94A3B8",

                  "&:hover": {
                    color:
                      "#fff",

                    bgcolor:
                      "rgba(255,255,255,0.06)",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>

            </Box>


            {/* NEW CHAT */}

            <Box
              sx={{
                p:
                  2,
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
                  loading
                }
                sx={{
                  py:
                    1.2,

                  borderRadius:
                    2.5,

                  textTransform:
                    "none",

                  fontWeight:
                    700,

                  bgcolor:
                    "#7C4DFF",

                  boxShadow:
                    "0 8px 25px rgba(124,77,255,0.22)",

                  "&:hover": {
                    bgcolor:
                      "#6D3FEA",
                  },
                }}
              >
                New Security Chat
              </Button>

            </Box>


            {/* SEARCH */}

            <Box
              sx={{
                px:
                  2,

                pb:
                  2,
              }}
            >

              <TextField
                fullWidth
                size="small"
                placeholder="Search conversations..."
                value={
                  conversationSearch
                }
                onChange={(
                  event
                ) =>
                  setConversationSearch(
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

                          fontSize:
                            20,
                        }}
                      />
                    </InputAdornment>
                  ),

                  endAdornment:
                    conversationSearch ? (
                      <InputAdornment
                        position="end"
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            setConversationSearch(
                              ""
                            )
                          }
                          sx={{
                            color:
                              "#64748B",
                          }}
                        >
                          <CloseIcon
                            fontSize="small"
                          />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                }}
                sx={{
                  "& .MuiOutlinedInput-root":
                    {
                      bgcolor:
                        "#111827",

                      color:
                        "#fff",

                      borderRadius:
                        2.5,

                      "& fieldset": {
                        borderColor:
                          "rgba(255,255,255,0.08)",
                      },

                      "&:hover fieldset": {
                        borderColor:
                          "rgba(0,229,255,0.35)",
                      },

                      "&.Mui-focused fieldset":
                        {
                          borderColor:
                            "#00E5FF",
                        },
                    },

                  "& input::placeholder": {
                    color:
                      "#64748B",

                    opacity:
                      1,
                  },
                }}
              />

            </Box>


            <Divider
              sx={{
                borderColor:
                  "rgba(255,255,255,0.07)",
              }}
            />


            {/* CONVERSATION LIST */}

            <Box
              sx={{
                flex:
                  1,

                overflowY:
                  "auto",

                "&::-webkit-scrollbar": {
                  width:
                    5,
                },

                "&::-webkit-scrollbar-thumb": {
                  background:
                    "#334155",

                  borderRadius:
                    10,
                },
              }}
            >

              {conversationsLoading ? (

                <Box
                  sx={{
                    display:
                      "flex",

                    justifyContent:
                      "center",

                    py:
                      5,
                  }}
                >

                  <CircularProgress
                    size={25}
                    sx={{
                      color:
                        "#00E5FF",
                    }}
                  />

                </Box>

              ) : filteredConversations.length ===
                0 ? (

                <Box
                  sx={{
                    textAlign:
                      "center",

                    px:
                      3,

                    py:
                      6,
                  }}
                >

                  <HistoryIcon
                    sx={{
                      fontSize:
                        42,

                      color:
                        "#334155",

                      mb:
                        1,
                    }}
                  />

                  <Typography
                    sx={{
                      color:
                        "#94A3B8",

                      fontWeight:
                        600,
                    }}
                  >
                    {conversationSearch
                      ? "No conversations found"
                      : "No conversations yet"}
                  </Typography>

                </Box>

              ) : (

                <List
                  disablePadding
                >

                  {filteredConversations.map(
                    (
                      conversation,
                      index
                    ) => {

                      const id =
                        conversation._id ||
                        conversation.id;

                      const title =
                        conversation.title ||
                        "Security Conversation";

                      const active =
                        String(
                          activeConversationId
                        ) ===
                        String(id);

                      const lastMessage =
                        conversation.last_message ||
                        conversation.lastMessage ||
                        conversation.preview ||
                        "";

                      return (

                        <ListItemButton
                          key={
                            id ||
                            index
                          }
                          selected={
                            active
                          }
                          onClick={() =>
                            handleSelectConversation(
                              id
                            )
                          }
                          disabled={
                            loading
                          }
                          sx={{
                            px:
                              2,

                            py:
                              1.5,

                            alignItems:
                              "flex-start",

                            borderBottom:
                              "1px solid rgba(255,255,255,0.045)",

                            "&.Mui-selected":
                              {
                                bgcolor:
                                  "rgba(124,77,255,0.14)",

                                borderLeft:
                                  "3px solid #7C4DFF",
                              },

                            "&:hover": {
                              bgcolor:
                                "rgba(255,255,255,0.04)",
                            },
                          }}
                        >

                          <ListItemText
                            primary={
                              title
                            }
                            secondary={
                              lastMessage ||
                              formatConversationDate(
                                conversation.updated_at ||
                                conversation.updatedAt ||
                                conversation.created_at
                              )
                            }
                            primaryTypographyProps={{
                              sx: {
                                color:
                                  "#E2E8F0",

                                fontWeight:
                                  active
                                    ? 700
                                    : 600,

                                fontSize:
                                  "0.88rem",

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",

                                whiteSpace:
                                  "nowrap",
                              },
                            }}
                            secondaryTypographyProps={{
                              sx: {
                                color:
                                  "#64748B",

                                fontSize:
                                  "0.72rem",

                                mt:
                                  0.4,

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",

                                whiteSpace:
                                  "nowrap",
                              },
                            }}
                          />


                          <Tooltip
                            title="Delete conversation"
                          >

                            <IconButton
                              size="small"
                              onClick={(
                                event
                              ) => {

                                event.stopPropagation();

                                handleDeleteConversation(
                                  id
                                );

                              }}
                              sx={{
                                color:
                                  "#64748B",

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

          </Box>

        </Drawer>


        {/* ====================================================
            MAIN WRAPPER
        ==================================================== */}

        <Box
          sx={{
            maxWidth:
              1450,

            mx:
              "auto",
          }}
        >

          {/* ==================================================
              TOP HEADER
          ================================================== */}

          <Paper
            elevation={0}
            sx={{
              p: {
                xs:
                  1.8,

                sm:
                  2.2,

                md:
                  2.5,
              },

              mb:
                2,

              borderRadius:
                3,

              background:
                "linear-gradient(135deg, #101827 0%, #0D1424 100%)",

              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >

            <Box
              sx={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  2,

                flexWrap:
                  "wrap",
              }}
            >

              {/* TITLE */}

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    1.5,

                  minWidth:
                    0,
                }}
              >

                <Avatar
                  sx={{
                    width: {
                      xs:
                        44,

                      sm:
                        50,
                    },

                    height: {
                      xs:
                        44,

                      sm:
                        50,
                    },

                    bgcolor:
                      "rgba(0,229,255,0.10)",

                    color:
                      "#00E5FF",

                    border:
                      "1px solid rgba(0,229,255,0.25)",
                  }}
                >
                  <SecurityIcon />
                </Avatar>


                <Box
                  sx={{
                    minWidth:
                      0,
                  }}
                >

                  <Typography
                    sx={{
                      fontSize: {
                        xs:
                          "1.15rem",

                        sm:
                          "1.35rem",

                        md:
                          "1.55rem",
                      },

                      fontWeight:
                        800,

                      color:
                        "#F8FAFC",

                      letterSpacing:
                        "-0.3px",
                    }}
                  >
                    AI Security Chat
                  </Typography>

                  <Typography
                    sx={{
                      color:
                        "#64748B",

                      fontSize: {
                        xs:
                          "0.72rem",

                        sm:
                          "0.8rem",
                      },

                      mt:
                        0.2,
                    }}
                  >
                    Context-aware cybersecurity assistant
                  </Typography>

                </Box>

              </Box>


              {/* ACTIONS */}

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    0.8,
                }}
              >

                <Button
                  variant="outlined"
                  startIcon={
                    <HistoryIcon />
                  }
                  onClick={() =>
                    setHistoryOpen(
                      true
                    )
                  }
                  sx={{
                    color:
                      "#00E5FF",

                    borderColor:
                      "rgba(0,229,255,0.25)",

                    borderRadius:
                      2,

                    textTransform:
                      "none",

                    fontWeight:
                      700,

                    px:
                      1.5,

                    "&:hover": {
                      borderColor:
                        "#00E5FF",

                      bgcolor:
                        "rgba(0,229,255,0.06)",
                    },
                  }}
                >
                  History
                </Button>


                <Button
                  variant="contained"
                  startIcon={
                    <AddIcon />
                  }
                  onClick={
                    handleNewChat
                  }
                  disabled={
                    loading
                  }
                  sx={{
                    bgcolor:
                      "#7C4DFF",

                    borderRadius:
                      2,

                    textTransform:
                      "none",

                    fontWeight:
                      700,

                    px:
                      1.5,

                    "&:hover": {
                      bgcolor:
                        "#6D3FEA",
                    },
                  }}
                >
                  New Chat
                </Button>

              </Box>

            </Box>

          </Paper>


          {/* ==================================================
              SECURITY CONTEXT BAR
          ================================================== */}

          <Paper
            elevation={0}
            sx={{
              mb:
                2,

              px:
                2,

              py:
                1.5,

              borderRadius:
                2.5,

              bgcolor:
                "#0D1627",

              border:
                "1px solid rgba(0,229,255,0.10)",
            }}
          >

            <Box
              sx={{
                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                gap:
                  1,

                flexWrap:
                  "wrap",
              }}
            >

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    1,

                  flexWrap:
                    "wrap",
                }}
              >

                <Chip
                  size="small"
                  icon={
                    <SecurityIcon
                      sx={{
                        fontSize:
                          "16px !important",
                      }}
                    />
                  }
                  label={
                    scanContext
                      ? "Scanner Context Active"
                      : "General Security Chat"
                  }
                  sx={{
                    color:
                      "#00E5FF",

                    bgcolor:
                      "rgba(0,229,255,0.08)",

                    border:
                      "1px solid rgba(0,229,255,0.18)",

                    fontWeight:
                      700,
                  }}
                />


                {scanContext?.language && (

                  <Chip
                    size="small"
                    icon={
                      <CodeIcon
                        sx={{
                          fontSize:
                            "16px !important",
                        }}
                      />
                    }
                    label={
                      scanContext.language
                    }
                    sx={{
                      color:
                        "#C4B5FD",

                      bgcolor:
                        "rgba(124,77,255,0.08)",

                      border:
                        "1px solid rgba(124,77,255,0.18)",
                    }}
                  />

                )}


                {scanContext?.totalIssues !==
                  undefined && (

                  <Chip
                    size="small"
                    icon={
                      <WarningAmberIcon
                        sx={{
                          fontSize:
                            "16px !important",
                        }}
                      />
                    }
                    label={
                      `${scanContext.totalIssues} issues`
                    }
                    sx={{
                      color:
                        scanContext.totalIssues > 0
                          ? "#FBBF24"
                          : "#34D399",

                      bgcolor:
                        scanContext.totalIssues > 0
                          ? "rgba(251,191,36,0.08)"
                          : "rgba(52,211,153,0.08)",

                      border:
                        scanContext.totalIssues > 0
                          ? "1px solid rgba(251,191,36,0.18)"
                          : "1px solid rgba(52,211,153,0.18)",
                    }}
                  />

                )}

              </Box>


              {/* CLEAR CONTEXT */}

              {scanContext && (

                <Button
                  size="small"
                  onClick={
                    handleClearScanContext
                  }
                  disabled={
                    loading
                  }
                  sx={{
                    color:
                      "#64748B",

                    textTransform:
                      "none",

                    fontSize:
                      "0.72rem",

                    "&:hover": {
                      color:
                        "#FF6B6B",

                      bgcolor:
                        "rgba(255,82,82,0.05)",
                    },
                  }}
                >
                  Clear context
                </Button>

              )}

            </Box>


            {/* SELECTED VULNERABILITY */}

            {selectedVulnerability && (

              <Box
                sx={{
                  mt:
                    1.2,

                  pt:
                    1.2,

                  borderTop:
                    "1px solid rgba(255,255,255,0.06)",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    1,

                  flexWrap:
                    "wrap",
                }}
              >

                <Typography
                  sx={{
                    color:
                      "#64748B",

                    fontSize:
                      "0.72rem",

                    fontWeight:
                      700,
                  }}
                >
                  ACTIVE VULNERABILITY
                </Typography>


                <Chip
                  size="small"
                  label={
                    vulnerabilityName
                  }
                  color={
                    getSeverityColor(
                      vulnerabilitySeverity
                    )
                  }
                  sx={{
                    fontWeight:
                      700,
                  }}
                />


                <Typography
                  sx={{
                    color:
                      "#94A3B8",

                    fontSize:
                      "0.72rem",
                  }}
                >
                  Severity:{" "}

                  <Box
                    component="span"
                    sx={{
                      color:
                        vulnerabilitySeverity
                          .toLowerCase() ===
                        "critical"
                          ? "#FF5252"
                          : vulnerabilitySeverity
                              .toLowerCase() ===
                            "high"
                          ? "#FF6B6B"
                          : "#FBBF24",

                      fontWeight:
                        700,
                    }}
                  >
                    {
                      vulnerabilitySeverity
                    }
                  </Box>

                </Typography>


                <Button
                  size="small"
                  onClick={
                    handleClearSelectedVulnerability
                  }
                  disabled={
                    loading
                  }
                  sx={{
                    minWidth:
                      0,

                    color:
                      "#64748B",

                    textTransform:
                      "none",

                    fontSize:
                      "0.7rem",

                    "&:hover": {
                      color:
                        "#FF6B6B",
                    },
                  }}
                >
                  Remove
                </Button>

              </Box>

            )}

          </Paper>


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <Alert
              severity="error"
              onClose={() =>
                setError("")
              }
              sx={{
                mb:
                  2,

                borderRadius:
                  2,

                bgcolor:
                  "rgba(127,29,29,0.25)",

                color:
                  "#FCA5A5",

                border:
                  "1px solid rgba(248,113,113,0.20)",
              }}
            >
              {error}
            </Alert>

          )}


          {/* ==================================================
              CHAT WINDOW
          ================================================== */}

          <Paper
            elevation={0}
            sx={{
              height: {
                xs:
                  "calc(100vh - 250px)",

                sm:
                  "calc(100vh - 245px)",

                md:
                  "calc(100vh - 255px)",
              },

              minHeight: {
                xs:
                  520,

                sm:
                  560,

                md:
                  600,
              },

              maxHeight:
                820,

              display:
                "flex",

              flexDirection:
                "column",

              overflow:
                "hidden",

              borderRadius:
                3,

              bgcolor:
                "#0B1220",

              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >

            {/* =================================================
                CHAT HEADER
            ================================================= */}

            <Box
              sx={{
                px: {
                  xs:
                    1.8,

                  sm:
                    2.5,
                },

                py:
                  1.5,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                borderBottom:
                  "1px solid rgba(255,255,255,0.07)",

                bgcolor:
                  "#0D1627",
              }}
            >

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    1.2,
                }}
              >

                <Box
                  sx={{
                    position:
                      "relative",
                  }}
                >

                  <Avatar
                    sx={{
                      width:
                        38,

                      height:
                        38,

                      bgcolor:
                        "rgba(124,77,255,0.18)",

                      color:
                        "#B388FF",

                      border:
                        "1px solid rgba(124,77,255,0.25)",
                    }}
                  >
                    <SmartToyIcon />
                  </Avatar>


                  <Box
                    sx={{
                      position:
                        "absolute",

                      width:
                        9,

                      height:
                        9,

                      borderRadius:
                        "50%",

                      bgcolor:
                        "#22C55E",

                      right:
                        -1,

                      bottom:
                        0,

                      border:
                        "2px solid #0D1627",
                    }}
                  />

                </Box>


                <Box>

                  <Typography
                    sx={{
                      fontWeight:
                        800,

                      color:
                        "#F8FAFC",

                      fontSize:
                        "0.92rem",
                    }}
                  >
                    Cybersecurity AI
                  </Typography>

                  <Typography
                    sx={{
                      color:
                        "#22C55E",

                      fontSize:
                        "0.68rem",

                      fontWeight:
                        600,
                    }}
                  >
                    AI assistant online
                  </Typography>

                </Box>

              </Box>


              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    0.5,
                }}
              >

                <Tooltip
                  title="Retry last question"
                >

                  <span>

                    <IconButton
                      onClick={
                        handleRetry
                      }
                      disabled={
                        loading ||
                        !messages.some(
                          (
                            item
                          ) =>
                            item.role ===
                            "user"
                        )
                      }
                      sx={{
                        color:
                          "#94A3B8",

                        "&:hover": {
                          color:
                            "#B388FF",

                          bgcolor:
                            "rgba(124,77,255,0.08)",
                        },
                      }}
                    >
                      <RefreshIcon
                        fontSize="small"
                      />
                    </IconButton>

                  </span>

                </Tooltip>


                <Tooltip
                  title="Clear chat"
                >

                  <span>

                    <IconButton
                      onClick={
                        handleClearChat
                      }
                      disabled={
                        loading
                      }
                      sx={{
                        color:
                          "#94A3B8",

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

                  </span>

                </Tooltip>

              </Box>

            </Box>


            {/* =================================================
                MESSAGES
            ================================================= */}

            <Box
              sx={{
                flex:
                  1,

                overflowY:
                  "auto",

                px: {
                  xs:
                    1.5,

                  sm:
                    2.5,

                  md:
                    4,
                },

                py: {
                  xs:
                    2,

                  sm:
                    2.5,
                },

                "&::-webkit-scrollbar": {
                  width:
                    6,
                },

                "&::-webkit-scrollbar-track": {
                  background:
                    "transparent",
                },

                "&::-webkit-scrollbar-thumb": {
                  background:
                    "#253047",

                  borderRadius:
                    10,
                },
              }}
            >

              {messages.map(
                (
                  item,
                  index
                ) => {

                  const isUser =
                    item.role ===
                    "user";

                  return (

                    <Box
                      key={
                        item.id ||
                        `${item.role}-${index}`
                      }
                      sx={{
                        display:
                          "flex",

                        justifyContent:
                          isUser
                            ? "flex-end"
                            : "flex-start",

                        mb:
                          2.5,
                      }}
                    >

                      <Box
                        sx={{
                          width:
                            "100%",

                          display:
                            "flex",

                          justifyContent:
                            isUser
                              ? "flex-end"
                              : "flex-start",
                        }}
                      >

                        <Box
                          sx={{
                            display:
                              "flex",

                            flexDirection:
                              isUser
                                ? "row-reverse"
                                : "row",

                            alignItems:
                              "flex-start",

                            gap:
                              1.2,

                            maxWidth: {
                              xs:
                                "96%",

                              sm:
                                "88%",

                              md:
                                "78%",
                            },
                          }}
                        >

                          {/* AVATAR */}

                          <Avatar
                            sx={{
                              width:
                                34,

                              height:
                                34,

                              flexShrink:
                                0,

                              bgcolor:
                                isUser
                                  ? "#0891B2"
                                  : "#6D3FEA",

                              color:
                                "#fff",
                            }}
                          >
                            {isUser ? (
                              <PersonIcon
                                fontSize="small"
                              />
                            ) : (
                              <SmartToyIcon
                                fontSize="small"
                              />
                            )}
                          </Avatar>


                          {/* MESSAGE */}

                          <Box>

                            <Typography
                              sx={{
                                color:
                                  "#64748B",

                                fontSize:
                                  "0.65rem",

                                fontWeight:
                                  700,

                                mb:
                                  0.5,

                                textAlign:
                                  isUser
                                    ? "right"
                                    : "left",
                              }}
                            >
                              {isUser
                                ? "You"
                                : "AI Security Assistant"}
                            </Typography>


                            <Paper
                              elevation={0}
                              sx={{
                                px: {
                                  xs:
                                    1.6,

                                  sm:
                                    2,
                                },

                                py:
                                  1.5,

                                borderRadius:
                                  isUser
                                    ? "18px 18px 4px 18px"
                                    : "18px 18px 18px 4px",

                                bgcolor:
                                  isUser
                                    ? "#075985"
                                    : "#151F33",

                                border:
                                  isUser
                                    ? "1px solid rgba(14,165,233,0.25)"
                                    : "1px solid rgba(255,255,255,0.06)",

                                boxShadow:
                                  "0 8px 25px rgba(0,0,0,0.12)",
                              }}
                            >

                              <Typography
                                component="div"
                                sx={{
                                  color:
                                    "#E2E8F0",

                                  whiteSpace:
                                    "pre-wrap",

                                  lineHeight:
                                    1.7,

                                  fontSize: {
                                    xs:
                                      "0.84rem",

                                    sm:
                                      "0.9rem",
                                  },

                                  wordBreak:
                                    "break-word",
                                }}
                              >
                                {
                                  item.content
                                }
                              </Typography>


                              {item.timestamp && (

                                <Typography
                                  sx={{
                                    color:
                                      "rgba(255,255,255,0.38)",

                                    fontSize:
                                      "0.62rem",

                                    mt:
                                      0.8,

                                    textAlign:
                                      isUser
                                        ? "right"
                                        : "left",
                                  }}
                                >
                                  {
                                    formatTime(
                                      item.timestamp
                                    )
                                  }
                                </Typography>

                              )}

                            </Paper>

                          </Box>

                        </Box>

                      </Box>

                    </Box>

                  );
                }
              )}


              {/* AI LOADING */}

              {loading && (

                <Box
                  sx={{
                    display:
                      "flex",

                    alignItems:
                      "flex-start",

                    gap:
                      1.2,

                    mb:
                      2,
                  }}
                >

                  <Avatar
                    sx={{
                      width:
                        34,

                      height:
                        34,

                      bgcolor:
                        "#6D3FEA",
                    }}
                  >
                    <SmartToyIcon
                      fontSize="small"
                    />
                  </Avatar>


                  <Paper
                    elevation={0}
                    sx={{
                      px:
                        2,

                      py:
                        1.5,

                      borderRadius:
                        "18px 18px 18px 4px",

                      bgcolor:
                        "#151F33",

                      border:
                        "1px solid rgba(255,255,255,0.06)",
                    }}
                  >

                    <Box
                      sx={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap:
                          1,
                      }}
                    >

                      <CircularProgress
                        size={16}
                        sx={{
                          color:
                            "#B388FF",
                        }}
                      />

                      <Typography
                        sx={{
                          color:
                            "#94A3B8",

                          fontSize:
                            "0.78rem",
                        }}
                      >
                        Analyzing security context...
                      </Typography>

                    </Box>

                  </Paper>

                </Box>

              )}

              <div
                ref={
                  chatEndRef
                }
              />

            </Box>


            {/* =================================================
                QUICK QUESTIONS
            ================================================= */}

            {messages.length <= 2 &&
              !loading && (

                <Box
                  sx={{
                    px: {
                      xs:
                        1.5,

                      sm:
                        2.5,

                      md:
                        4,
                    },

                    pb:
                      1.5,
                  }}
                >

                  <Typography
                    sx={{
                      color:
                        "#64748B",

                      fontSize:
                        "0.68rem",

                      fontWeight:
                        800,

                      mb:
                        1,

                      textTransform:
                        "uppercase",

                      letterSpacing:
                        "0.7px",
                    }}
                  >
                    Suggested questions
                  </Typography>


                  <Box
                    sx={{
                      display:
                        "flex",

                      gap:
                        0.8,

                      overflowX: {
                        xs:
                          "auto",

                        sm:
                          "visible",
                      },

                      flexWrap: {
                        xs:
                          "nowrap",

                        sm:
                          "wrap",
                      },

                      pb:
                        0.5,

                      "&::-webkit-scrollbar": {
                        height:
                          3,
                      },
                    }}
                  >

                    {quickQuestions.map(
                      (
                        question
                      ) => (

                        <Chip
                          key={
                            question
                          }
                          label={
                            question
                          }
                          clickable
                          disabled={
                            loading
                          }
                          onClick={() =>
                            sendMessage(
                              question
                            )
                          }
                          sx={{
                            flexShrink:
                              0,

                            height:
                              34,

                            color:
                              "#CBD5E1",

                            bgcolor:
                              "#111827",

                            border:
                              "1px solid rgba(255,255,255,0.08)",

                            borderRadius:
                              2,

                            fontSize:
                              "0.72rem",

                            "&:hover": {
                              color:
                                "#00E5FF",

                              borderColor:
                                "rgba(0,229,255,0.35)",

                              bgcolor:
                                "rgba(0,229,255,0.05)",
                            },
                          }}
                        />

                      )
                    )}

                  </Box>

                </Box>

              )}


            {/* =================================================
                INPUT AREA
            ================================================= */}

            <Box
              sx={{
                p: {
                  xs:
                    1.2,

                  sm:
                    1.8,
                },

                borderTop:
                  "1px solid rgba(255,255,255,0.07)",

                bgcolor:
                  "#080F1D",
              }}
            >

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "flex-end",

                  gap:
                    1,

                  p:
                    0.6,

                  borderRadius:
                    3,

                  bgcolor:
                    "#111827",

                  border:
                    "1px solid rgba(255,255,255,0.08)",

                  transition:
                    "all 0.2s ease",

                  "&:focus-within": {
                    borderColor:
                      "rgba(0,229,255,0.45)",

                    boxShadow:
                      "0 0 0 3px rgba(0,229,255,0.06)",
                  },
                }}
              >

                <TextField
                  fullWidth
                  multiline
                  maxRows={5}
                  placeholder={
                    selectedVulnerability
                      ? `Ask about ${vulnerabilityName}...`
                      : "Ask your cybersecurity question..."
                  }
                  value={
                    message
                  }
                  onChange={(
                    event
                  ) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={
                    loading
                  }
                  variant="standard"
                  InputProps={{
                    disableUnderline:
                      true,
                  }}
                  sx={{
                    px:
                      1,

                    "& textarea": {
                      color:
                        "#F8FAFC",

                      fontSize:
                        "0.88rem",

                      lineHeight:
                        1.5,

                      padding:
                        "8px 4px",
                    },

                    "& textarea::placeholder": {
                      color:
                        "#64748B",

                      opacity:
                        1,
                    },
                  }}
                />


                {message && (

                  <Tooltip
                    title="Clear input"
                  >

                    <IconButton
                      onClick={
                        handleClearInput
                      }
                      disabled={
                        loading
                      }
                      sx={{
                        mb:
                          0.2,

                        color:
                          "#64748B",

                        "&:hover": {
                          color:
                            "#fff",
                        },
                      }}
                    >
                      <CloseIcon
                        fontSize="small"
                      />
                    </IconButton>

                  </Tooltip>

                )}


                <Tooltip
                  title="Send message"
                >

                  <span>

                    <IconButton
                      onClick={() =>
                        sendMessage()
                      }
                      disabled={
                        loading ||
                        !message.trim()
                      }
                      sx={{
                        width:
                          46,

                        height:
                          46,

                        flexShrink:
                          0,

                        mb:
                          0.1,

                        bgcolor:
                          "#7C4DFF",

                        color:
                          "#fff",

                        borderRadius:
                          2.3,

                        boxShadow:
                          "0 7px 20px rgba(124,77,255,0.25)",

                        "&:hover": {
                          bgcolor:
                            "#6D3FEA",
                        },

                        "&.Mui-disabled": {
                          bgcolor:
                            "#1E293B",

                          color:
                            "#475569",
                        },
                      }}
                    >

                      {loading ? (

                        <CircularProgress
                          size={20}
                          color="inherit"
                        />

                      ) : (

                        <SendIcon />

                      )}

                    </IconButton>

                  </span>

                </Tooltip>

              </Box>


              {/* INPUT FOOTER */}

              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  mt:
                    0.8,

                  px:
                    0.5,
                }}
              >

                <Typography
                  sx={{
                    color:
                      "#475569",

                    fontSize:
                      "0.62rem",
                  }}
                >
                  Enter to send • Shift + Enter for new line
                </Typography>


                {activeConversationId && (

                  <Chip
                    size="small"
                    icon={
                      <HistoryIcon
                        sx={{
                          fontSize:
                            "13px !important",
                        }}
                      />
                    }
                    label="Saved"
                    sx={{
                      height:
                        22,

                      color:
                        "#94A3B8",

                      bgcolor:
                        "rgba(255,255,255,0.03)",

                      fontSize:
                        "0.6rem",
                    }}
                  />

                )}

              </Box>

            </Box>

          </Paper>


          {/* ==================================================
              FOOTER
          ================================================== */}

          <Box
            sx={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              gap:
                0.7,

              mt:
                1.3,
            }}
          >

            <SecurityIcon
              sx={{
                fontSize:
                  13,

                color:
                  "#334155",
              }}
            />

            <Typography
              sx={{
                color:
                  "#475569",

                fontSize:
                  "0.65rem",

                textAlign:
                  "center",
              }}
            >
              AI responses may use your scanner results and
              selected vulnerability context.
            </Typography>

          </Box>

        </Box>

      </Box>

    </Layout>
  );
};


export default AIChat;