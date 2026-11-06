import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
  IconButton,
  Divider,
  Tooltip,
  Drawer,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import SecurityIcon from "@mui/icons-material/Security";

import { useLocation } from "react-router-dom";

import Layout from "../components/Layout";
import ChatInput from "../components/ChatInput";
import ConversationSidebar from "../components/ConversationSidebar";

import API from "../services/api";

import {
  getScanContext,
  saveScanContext,
  clearScanContext,
} from "../utils/scanContext";

// ============================================================
// WELCOME MESSAGE
// ============================================================

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "👋 Hello! I am your AI Cybersecurity Assistant.\n\n" +
    "Ask me anything about:\n\n" +
    "• Security vulnerabilities\n" +
    "• OWASP Top 10\n" +
    "• SQL Injection\n" +
    "• XSS\n" +
    "• CSRF\n" +
    "• Secure coding\n" +
    "• Authentication & Authorization\n" +
    "• API Security\n" +
    "• Penetration Testing\n" +
    "• Code security issues",
};

// ============================================================
// HELPERS
// ============================================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  null;

// Axios and fetch both use the same Flask backend.  The chat endpoint
// is streamed, so fetch() is used instead of API.post() for /ai/chat.
const getChatStreamUrl = () => {
  const baseURL =
    API?.defaults?.baseURL ||
    import.meta?.env?.VITE_API_URL ||
    "http://127.0.0.1:5000";

  return `${String(baseURL).replace(/\/$/, "")}/ai/chat`;
};

const parseStreamLine = (line) => {
  const cleanLine = String(line || "").trim();

  if (!cleanLine) return null;

  // Supports normal NDJSON from the Flask/FastAPI streaming endpoint.
  try {
    return JSON.parse(cleanLine);
  } catch {
    // Also tolerate accidental SSE formatting if a proxy adds `data:`.
    const withoutDataPrefix = cleanLine.startsWith("data:")
      ? cleanLine.slice(5).trim()
      : cleanLine;

    if (!withoutDataPrefix || withoutDataPrefix === "[DONE]") {
      return withoutDataPrefix === "[DONE]"
        ? { done: true }
        : null;
    }

    try {
      return JSON.parse(withoutDataPrefix);
    } catch {
      return null;
    }
  }
};

const getResponseMessage = (data) =>
  data?.response ||
  data?.message ||
  data?.answer ||
  data?.reply ||
  "AI did not generate a response.";

const getConversationIdFromResponse = (data) =>
  data?.conversation_id ||
  data?.conversationId ||
  data?.conversation?.id ||
  data?.conversation?._id ||
  null;

const normalizeChatMessages = (conversationMessages) => {
  if (!Array.isArray(conversationMessages)) return [];

  return conversationMessages
    .filter(
      (message) =>
        message?.role && message?.content != null
    )
    .map((message, index) => ({
      id:
        message?._id ||
        message?.id ||
        `${message.role}-${Date.now()}-${index}`,
      role: message.role,
      content: String(message.content),
      timestamp:
        message?.timestamp ||
        message?.created_at ||
        message?.createdAt ||
        new Date().toISOString(),
    }));
};

const getConversationId = (conversation) =>
  conversation?._id ||
  conversation?.id ||
  conversation?.conversation_id ||
  conversation?.conversationId ||
  null;

const getVulnerabilityName = (vulnerability) =>
  vulnerability?.type ||
  vulnerability?.name ||
  vulnerability?.vulnerability ||
  vulnerability?.title ||
  vulnerability?.vulnerability?.type ||
  vulnerability?.vulnerability?.name ||
  "Selected Issue";

const getVulnerabilitySeverity = (vulnerability) =>
  vulnerability?.severity ||
  vulnerability?.level ||
  vulnerability?.vulnerability?.severity ||
  "Unknown";

const getVulnerabilityLine = (vulnerability) =>
  vulnerability?.line ??
  vulnerability?.lineNumber ??
  vulnerability?.line_number ??
  vulnerability?.vulnerability?.line ??
  "Unknown";

const getVulnerabilityProblem = (vulnerability) =>
  vulnerability?.problem ||
  vulnerability?.description ||
  vulnerability?.issue ||
  vulnerability?.message ||
  vulnerability?.vulnerability?.problem ||
  vulnerability?.vulnerability?.description ||
  "Security issue detected by the scanner.";

const getVulnerabilityFix = (vulnerability) =>
  vulnerability?.recommendation ||
  vulnerability?.fix ||
  vulnerability?.solution ||
  vulnerability?.remediation ||
  vulnerability?.vulnerability?.recommendation ||
  vulnerability?.vulnerability?.fix ||
  "Apply secure coding practices and remove the vulnerable pattern.";

const getVulnerabilityCode = (vulnerability) =>
  vulnerability?.code ||
  vulnerability?.snippet ||
  vulnerability?.codeSnippet ||
  vulnerability?.source ||
  vulnerability?.vulnerable_code ||
  "";

// ============================================================
// BUILD SCANNER QUESTION
// IMPORTANT: This only creates editable draft text.
// It is NOT automatically sent to the backend.
// ============================================================

const buildScannerQuestion = (vulnerability) => {
  if (!vulnerability) {
    return "Analyze my latest security scan results and explain the detected vulnerabilities, their security impact, and how I can fix them securely.";
  }

  const name = getVulnerabilityName(vulnerability);
  const severity = getVulnerabilitySeverity(vulnerability);
  const line = getVulnerabilityLine(vulnerability);
  const problem = getVulnerabilityProblem(vulnerability);
  const fix = getVulnerabilityFix(vulnerability);
  const code = getVulnerabilityCode(vulnerability);

  const cwe =
    vulnerability?.cwe ||
    vulnerability?.CWE ||
    vulnerability?.vulnerability?.cwe ||
    "";

  const owasp =
    vulnerability?.owasp ||
    vulnerability?.OWASP ||
    vulnerability?.vulnerability?.owasp ||
    "";

  return (
    `How do I fix this ${name} vulnerability?\n\n` +
    `Severity: ${severity}\n` +
    `Line: ${line}\n` +
    (cwe ? `CWE: ${cwe}\n` : "") +
    (owasp ? `OWASP: ${owasp}\n` : "") +
    `\nProblem: ${problem}\n\n` +
    `Scanner recommendation: ${fix}\n\n` +
    (code
      ? `Vulnerable code:\n${code}\n\n`
      : "") +
    "Please explain the root cause, security impact, " +
    "possible exploitation risk, and give me a secure " +
    "fixed-code example."
  );
};

// ============================================================
// INLINE CHAT MESSAGE
// ============================================================
// This component intentionally renders the message here instead of
// relying on the older ChatMessage component. The streaming response
// updates `content` token-by-token, so the UI must read `content`
// directly. This also fixes the blank "AI Assistant" bubbles.
// ============================================================

const InlineChatMessage = ({ message }) => {
  const isUser =
    message?.role === "user" ||
    message?.role === "human";

  const content = String(message?.content || "");

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        width: "100%",
        mb: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: {
            xs: "92%",
            sm: "82%",
            md: "75%",
          },
          minWidth: content ? 0 : 110,
          px: 1.8,
          py: 1.25,
          borderRadius: isUser
            ? "16px 16px 4px 16px"
            : "16px 16px 16px 4px",
          bgcolor: isUser ? "#075985" : "#1e293b",
          border: isUser
            ? "1px solid rgba(0,212,255,0.35)"
            : "1px solid rgba(148,163,184,0.14)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
        }}
      >
        <Typography
          sx={{
            color: isUser ? "#dff8ff" : "#9fdcff",
            fontSize: 12,
            fontWeight: 700,
            mb: 0.65,
          }}
        >
          {isUser ? "You" : "AI Assistant"}
        </Typography>

        {content ? (
          <Typography
            component="div"
            sx={{
              color: "#f1f5f9",
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {content}
            {message?.streaming && (
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: 6,
                  height: 16,
                  ml: 0.5,
                  verticalAlign: "-2px",
                  bgcolor: "#00d4ff",
                  borderRadius: 1,
                  animation: "chatBlink 0.9s infinite",
                  "@keyframes chatBlink": {
                    "0%, 45%": { opacity: 1 },
                    "46%, 100%": { opacity: 0.15 },
                  },
                }}
              />
            )}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 0.55,
              alignItems: "center",
              py: 0.3,
            }}
          >
            {[0, 1, 2].map((item) => (
              <Box
                key={item}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "#94a3b8",
                  animation: `chatDot 1.2s ${item * 0.15}s infinite ease-in-out`,
                  "@keyframes chatDot": {
                    "0%, 80%, 100%": {
                      transform: "scale(0.7)",
                      opacity: 0.45,
                    },
                    "40%": {
                      transform: "scale(1)",
                      opacity: 1,
                    },
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ============================================================
// CHATBOT
// ============================================================

const Chatbot = () => {
  const location = useLocation();

  // ==========================================================
  // STATE
  // ==========================================================

  const [messages, setMessages] = useState([
    WELCOME_MESSAGE,
  ]);

  const [conversations, setConversations] = useState([]);

  const [activeConversationId, setActiveConversationId] =
    useState(null);

  const [loading, setLoading] = useState(false);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [showHistory, setShowHistory] =
    useState(false);

  const [error, setError] = useState(null);

  const [scanContext, setScanContext] =
    useState(null);

  const [selectedVulnerability, setSelectedVulnerability] =
    useState(null);

  // Controlled ChatInput draft.
  // Scanner question is placed here but never auto-sent.
  const [inputDraft, setInputDraft] = useState("");

  // ==========================================================
  // REFS
  // ==========================================================

  const messagesEndRef = useRef(null);

  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // ==========================================================
  // LOAD CONVERSATIONS
  // Only called when sidebar is opened or when it is already open.
  // ==========================================================

  const loadConversations = useCallback(async () => {
    try {
      setHistoryLoading(true);

      const token = getToken();

      const response = await API.get(
        "/conversations",
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {}
      );

      const data = response?.data;

      const candidates = [
        data?.conversations,
        data?.data?.conversations,
        data?.data?.items,
        data?.results,
        data?.items,
        data?.data,
      ];

      const conversationList =
        candidates.find((item) => Array.isArray(item)) || [];

      setConversations(conversationList);
    } catch (err) {
      console.error(
        "Failed to load conversations:",
        err
      );

      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ==========================================================
  // HISTORY LOAD TRIGGER
  // Sidebar remains closed during normal chat.
  // ==========================================================

  useEffect(() => {
    if (!showHistory) return;

    loadConversations();
  }, [showHistory, loadConversations]);

  // ==========================================================
  // LOAD INITIAL SCAN / VULNERABILITY CONTEXT
  // Scanner -> Chatbot
  // ==========================================================

  useEffect(() => {
    const state = location.state || {};

    const navigationScanContext =
      state.scanContext ||
      state.scan_context ||
      null;

    const storedScanContext = getScanContext();

    // Only use stored scan context when scanner navigation data
    // is not present. This prevents an old scanner context from
    // appearing in a normal fresh chatbot conversation.
    const scannerFlowDetected = Boolean(
      navigationScanContext ||
      state.selectedVulnerability ||
      state.vulnerability ||
      state.vulnerabilityContext ||
      state.initialQuestion
    );

    const incomingScanContext =
      navigationScanContext ||
      (scannerFlowDetected ? storedScanContext : null) ||
      null;

    const incomingVulnerability =
      state.selectedVulnerability ||
      state.vulnerability ||
      state.vulnerabilityContext ||
      incomingScanContext?.selectedVulnerability ||
      incomingScanContext?.selected_vulnerability ||
      null;

    const initialQuestion =
      state.initialQuestion || "";

    if (
      !incomingScanContext &&
      !incomingVulnerability &&
      !initialQuestion
    ) {
      return;
    }

    if (incomingScanContext) {
      setScanContext(incomingScanContext);
      saveScanContext(incomingScanContext);
    }

    setSelectedVulnerability(
      incomingVulnerability
    );

    setActiveConversationId(null);
    setError(null);
    setMessages([WELCOME_MESSAGE]);

    // Vulnerability-specific question gets priority.
    // It is only inserted into the input box.
    const draftQuestion = incomingVulnerability
      ? buildScannerQuestion(incomingVulnerability)
      : initialQuestion;

    setInputDraft(draftQuestion || "");

    // Scanner navigation should never open history.
    setShowHistory(false);
  }, [location.key]);

  // ==========================================================
  // LOAD SINGLE CONVERSATION
  // ==========================================================

  const loadConversation = async (conversationId) => {
    if (!conversationId || loading) return;

    // Selecting a conversation closes the sidebar.
    setShowHistory(false);
    setInputDraft("");
    setError(null);

    try {
      setLoading(true);

      const token = getToken();

      const response = await API.get(
        `/conversations/${conversationId}`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {}
      );

      const data = response?.data;

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to load conversation."
        );
      }

      const conversation =
        data?.conversation ||
        data?.data?.conversation ||
        data?.data ||
        {};

      const rawMessages =
        conversation?.messages ||
        conversation?.chat_history ||
        conversation?.chatHistory ||
        conversation?.history ||
        [];

      const conversationMessages =
        normalizeChatMessages(rawMessages);

      setMessages(
        conversationMessages.length > 0
          ? conversationMessages
          : [WELCOME_MESSAGE]
      );

      // Restore scanner context saved with this conversation.
      const savedScanContext =
        conversation?.scan_context ||
        conversation?.scanContext ||
        null;

      const savedVulnerability =
        conversation?.vulnerability_context ||
        conversation?.vulnerabilityContext ||
        conversation?.selected_vulnerability ||
        conversation?.selectedVulnerability ||
        null;

      setScanContext(savedScanContext);
      setSelectedVulnerability(savedVulnerability);

      const resolvedId =
        getConversationId(conversation) ||
        conversationId;

      setActiveConversationId(resolvedId);
      setError(null);
    } catch (err) {
      console.error(
        "Failed to load conversation:",
        err
      );

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load conversation.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // NEW CHAT
  // ==========================================================

  const handleNewChat = () => {
    if (loading) return;

    setShowHistory(false);
    setActiveConversationId(null);
    setMessages([WELCOME_MESSAGE]);
    setScanContext(null);
    setSelectedVulnerability(null);
    setInputDraft("");
    setError(null);
    clearScanContext();
  };

  const handleNewConversation = () => {
    handleNewChat();
  };

  // ==========================================================
  // DELETE CONVERSATION
  // ==========================================================

  const handleDeleteConversation = async (conversationId) => {
    if (!conversationId) return;

    try {
      setError(null);

      const token = getToken();

      await API.delete(
        `/conversations/${conversationId}`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {}
      );

      setConversations((previous) =>
        previous.filter((conversation) => {
          const id = getConversationId(conversation);
          return String(id) !== String(conversationId);
        })
      );

      if (
        String(activeConversationId) ===
        String(conversationId)
      ) {
        handleNewChat();
      }
    } catch (err) {
      console.error(
        "Failed to delete conversation:",
        err
      );

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete conversation.";

      setError(errorMessage);
    }
  };

  // ==========================================================
  // CLEAR VULNERABILITY CONTEXT
  // X button = fresh normal conversation.
  // ==========================================================

  const clearVulnerabilityContext = () => {
    setSelectedVulnerability(null);
    setScanContext(null);
    setInputDraft("");
    setActiveConversationId(null);
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setShowHistory(false);
    clearScanContext();
  };

  const clearScanContextState = () => {
    setScanContext(null);
  };

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const handleSend = useCallback(
    async (message) => {
      const cleanMessage = String(message || "").trim();

      if (!cleanMessage || loading) return;

      setInputDraft("");
      setError(null);

      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: cleanMessage,
      };

      // Capture the history BEFORE adding the new user message.
      // This keeps the backend history clean and avoids duplicating
      // the current message in the history payload.
      const chatHistory = messages
        .filter(
          (item) => item?.id !== "welcome-message"
        )
        .slice(-10)
        .map((item) => ({
          role:
            item?.role === "human"
              ? "user"
              : item?.role === "ai"
                ? "assistant"
                : item?.role || "assistant",
          content: String(item?.content || ""),
        }))
        .filter((item) => item.content.trim());

      setMessages((previous) => [
        ...previous,
        userMessage,
      ]);

      // The assistant placeholder is created immediately. Each streamed
      // chunk is appended to this same message, producing ChatGPT-like
      // progressive rendering instead of waiting for the full response.
      const assistantMessageId = `assistant-${Date.now()}`;

      setMessages((previous) => [
        ...previous,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);

      try {
        setLoading(true);

        const token = getToken();

        const payload = {
          message: cleanMessage,
          question: cleanMessage,
          prompt: cleanMessage,

          history: chatHistory,
          messages: chatHistory,
          chat_history: chatHistory,
          chatHistory: chatHistory,

          ...(activeConversationId
            ? {
                conversation_id: activeConversationId,
                conversationId: activeConversationId,
              }
            : {}),
        };

        // --------------------------------------------------------
        // SCAN CONTEXT
        // --------------------------------------------------------
        if (scanContext) {
          payload.scan_context = scanContext;
          payload.scanContext = scanContext;

          payload.source_code =
            scanContext?.sourceCode ||
            scanContext?.source_code ||
            "";
          payload.sourceCode = payload.source_code;

          payload.language =
            scanContext?.language || "";

          payload.scan_id =
            scanContext?.scan_id ||
            scanContext?.scanId ||
            scanContext?._id ||
            "";
          payload.scanId = payload.scan_id;

          payload.risk_score =
            scanContext?.risk_score ??
            scanContext?.riskScore ??
            null;
          payload.riskScore = payload.risk_score;

          payload.total_issues =
            scanContext?.total_issues ??
            scanContext?.totalIssues ??
            null;
          payload.totalIssues = payload.total_issues;

          payload.status = scanContext?.status || "";
          payload.grade = scanContext?.grade || "";

          payload.confidence =
            scanContext?.confidence ?? null;

          payload.vulnerabilities =
            Array.isArray(scanContext?.vulnerabilities)
              ? scanContext.vulnerabilities
              : [];
        }

        // --------------------------------------------------------
        // SELECTED VULNERABILITY
        // --------------------------------------------------------
        if (selectedVulnerability) {
          payload.selected_vulnerability =
            selectedVulnerability;
          payload.selectedVulnerability =
            selectedVulnerability;
          payload.vulnerability_context =
            selectedVulnerability;
          payload.vulnerabilityContext =
            selectedVulnerability;
        }

        // --------------------------------------------------------
        // STREAM FROM FLASK /ai/chat
        // --------------------------------------------------------
        const response = await fetch(
          getChatStreamUrl(),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/x-ndjson",
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            body: JSON.stringify(payload),
          }
        );

        console.log(
          "AI stream HTTP status:",
          response.status,
          "content-type:",
          response.headers.get("content-type")
        );

        if (!response.ok) {
          let serverMessage =
            `AI request failed with HTTP ${response.status}.`;

          try {
            const errorText = await response.text();

            if (errorText) {
              try {
                const errorData = JSON.parse(errorText);
                serverMessage =
                  errorData?.message ||
                  errorData?.error ||
                  serverMessage;
              } catch {
                serverMessage = errorText;
              }
            }
          } catch {
            // Keep the HTTP status message.
          }

          throw new Error(serverMessage);
        }

        if (!response.body) {
          throw new Error(
            "Streaming response is not supported by this browser or backend."
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let buffer = "";
        let assistantText = "";
        let returnedConversationId = null;
        let streamFinished = false;
        let receivedChunk = false;

        const updateAssistantMessage = (chunk) => {
          if (!chunk) return;

          assistantText += String(chunk);
          receivedChunk = true;

          setMessages((previous) =>
            previous.map((item) =>
              item.id === assistantMessageId
                ? {
                    ...item,
                    content: assistantText,
                    streaming: true,
                  }
                : item
            )
          );
        };

        const processLine = (line) => {
          const data = parseStreamLine(line);

          if (!data) return;

          if (data.success === false) {
            throw new Error(
              data.message ||
                data.error ||
                "AI failed to generate a response."
            );
          }

          const chunk =
            data.chunk ??
            data.delta ??
            data.token ??
            data.text ??
            "";

          if (chunk) {
            console.debug("AI stream chunk:", chunk);
            updateAssistantMessage(chunk);
          }

          const id =
            data.conversation_id ||
            data.conversationId ||
            data.conversation?.id ||
            data.conversation?._id ||
            data.data?.conversation_id ||
            data.data?.conversationId ||
            null;

          if (id) {
            returnedConversationId = id;
          }

          if (data.done === true) {
            streamFinished = true;
          }

          // Some implementations send a final complete response instead
          // of chunks. Support that format as a safe fallback.
          if (!chunk && data.done === true) {
            const finalText =
              data.response ||
              data.answer ||
              data.message ||
              data.reply ||
              data.content ||
              data.data?.response ||
              data.data?.answer ||
              "";

            if (finalText && !receivedChunk) {
              updateAssistantMessage(finalText);
            }
          }
        };

        try {
          while (true) {
            const { value, done } =
              await reader.read();

            if (done) break;

            buffer += decoder.decode(value, {
              stream: true,
            });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";

            for (const line of lines) {
              processLine(line);
            }
          }

          // Flush any remaining decoder bytes and process the final line.
          buffer += decoder.decode();

          if (buffer.trim()) {
            processLine(buffer);
          }
        } finally {
          reader.releaseLock();
        }

        if (!streamFinished && !assistantText.trim()) {
          throw new Error(
            "AI returned an empty streaming response."
          );
        }

        // Mark the assistant response as complete.
        setMessages((previous) =>
          previous.map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content:
                    item.content ||
                    "AI did not generate a response.",
                  streaming: false,
                }
              : item
          )
        );

        if (returnedConversationId) {
          setActiveConversationId(
            returnedConversationId
          );
        }

        if (showHistory) {
          await loadConversations();
        }
      } catch (err) {
        console.error(
          "AI Streaming Chat Error:",
          err
        );

        const errorMessage =
          err?.message ||
          "Failed to connect to AI service.";

        setError(errorMessage);

        // Remove the empty/partial assistant placeholder and show a
        // clean error message instead of displaying a blank AI bubble.
        setMessages((previous) => {
          const withoutStreamingMessage =
            previous.filter(
              (item) =>
                item.id !== assistantMessageId
            );

          return [
            ...withoutStreamingMessage,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              content:
                `❌ ${errorMessage}\n\n` +
                "Please check whether Flask, FastAPI, and Ollama are running.",
            },
          ];
        });
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      messages,
      activeConversationId,
      scanContext,
      selectedVulnerability,
      showHistory,
      loadConversations,
    ]
  );

  // ==========================================================
  // IMPORTANT:
  // There is intentionally NO automatic-send useEffect here.
  // Scanner question is only placed into inputDraft.
  // User must click Send.
  // ==========================================================

  // ==========================================================
  // VULNERABILITY DISPLAY DATA
  // ==========================================================

  const vulnerabilityName =
    getVulnerabilityName(
      selectedVulnerability
    );

  const vulnerabilitySeverity =
    getVulnerabilitySeverity(
      selectedVulnerability
    );

  const vulnerabilityLine =
    getVulnerabilityLine(
      selectedVulnerability
    );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Layout>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 100px)",
        }}
      >
        {/* ==================================================
            HEADER
        =================================================== */}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <SmartToyIcon
                sx={{
                  color: "#00d4ff",
                  fontSize: 32,
                }}
              />

              <Typography
                variant="h4"
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: {
                    xs: "1.55rem",
                    sm: "2rem",
                  },
                }}
              >
                AI Security Chatbot
              </Typography>
            </Box>

            <Typography
              sx={{
                color: "#8b95a7",
                mt: 0.5,
              }}
            >
              Ask questions about cybersecurity,
              vulnerabilities and secure coding.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            {/* Sidebar is opened ONLY by this hamburger. */}
            <Tooltip title="Conversations">
              <IconButton
                onClick={() => setShowHistory(true)}
                disabled={loading}
                sx={{
                  color: "#00d4ff",
                  border: "1px solid #24304a",
                  borderRadius: 2,
                }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Start a new conversation">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewChat}
                disabled={loading}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  bgcolor: "#00d4ff",
                  color: "#000",
                  "&:hover": {
                    bgcolor: "#00b8df",
                  },
                  display: {
                    xs: "none",
                    sm: "inline-flex",
                  },
                }}
              >
                New Chat
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* ==================================================
            MAIN CHAT LAYOUT
        =================================================== */}

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flex: 1,
            minHeight: 0,
            width: "100%",
          }}
        >
          {/* ==================================================
              CONVERSATION SIDEBAR
              Hidden by default.
          =================================================== */}

          <Drawer
            anchor="left"
            open={showHistory}
            onClose={() => setShowHistory(false)}
            PaperProps={{
              sx: {
                width: {
                  xs: "88vw",
                  sm: 360,
                },
                maxWidth: 380,
                bgcolor: "#0B1220",
                color: "#fff",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                p: 1,
                borderBottom: "1px solid #1d2942",
              }}
            >
              <IconButton
                onClick={() => setShowHistory(false)}
                sx={{ color: "#aab4c5" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <ConversationSidebar
              conversations={conversations}
              activeConversationId={
                activeConversationId
              }
              loading={loading}
              conversationsLoading={
                historyLoading
              }
              onNewChat={handleNewChat}
              onNewConversation={
                handleNewConversation
              }
              onSelectConversation={
                loadConversation
              }
              onDeleteConversation={
                handleDeleteConversation
              }
              onClose={() => setShowHistory(false)}
            />
          </Drawer>

          {/* ==================================================
              CHAT AREA
          =================================================== */}

          <Paper
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              bgcolor: "#111a2e",
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              border: "1px solid #1d2942",
              overflow: "hidden",
            }}
          >
            {/* ==================================================
                ACTIVE SECURITY CONTEXT
            =================================================== */}

            {(selectedVulnerability ||
              scanContext) && (
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom:
                    "1px solid #24304a",
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  alignItems: "center",
                  bgcolor: "#0d1424",
                }}
              >
                {selectedVulnerability && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      border:
                        "1px solid rgba(255,183,77,0.4)",
                      bgcolor:
                        "rgba(255,183,77,0.08)",
                      maxWidth: "100%",
                    }}
                  >
                    <SecurityIcon
                      sx={{ color: "#ffb74d" }}
                    />

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          color: "#ffb74d",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Selected Vulnerability
                      </Typography>

                      <Typography
                        sx={{
                          color: "#d5d9e0",
                          fontSize: 13,
                          mt: 0.3,
                          wordBreak: "break-word",
                        }}
                      >
                        {vulnerabilityName}
                        {" • "}
                        Severity: {vulnerabilitySeverity}
                        {" • "}
                        Line: {vulnerabilityLine}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={
                        clearVulnerabilityContext
                      }
                      sx={{
                        color: "#ffb74d",
                        ml: 1,
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}

                {scanContext && (
                  <Chip
                    label={`Scan Context: ${
                      scanContext.language ||
                      scanContext.file_name ||
                      scanContext.filename ||
                      "Source Code"
                    }`}
                    onDelete={clearScanContextState}
                    deleteIcon={<CloseIcon />}
                    variant="outlined"
                    sx={{
                      color: "#64b5f6",
                      borderColor: "#64b5f6",
                      bgcolor:
                        "rgba(100,181,246,0.06)",
                    }}
                  />
                )}
              </Box>
            )}

            {/* ==================================================
                CHAT INFO BAR
            =================================================== */}

            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  Cybersecurity Assistant
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: "#00d4ff" }}
                >
                  {activeConversationId
                    ? "Conversation active"
                    : selectedVulnerability
                      ? "Vulnerability context active"
                      : "New conversation"}
                </Typography>
              </Box>

              {messages.length > 1 && (
                <Tooltip title="Clear current chat">
                  <IconButton
                    onClick={handleNewChat}
                    disabled={loading}
                    sx={{ color: "#ff6b6b" }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Divider
              sx={{ borderColor: "#1d2942" }}
            />

            {/* ==================================================
                CHAT MESSAGES
            =================================================== */}

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2.5,
                minHeight: 0,
              }}
            >
              {messages.map((message, index) => (
                <InlineChatMessage
                  key={`${message.id || message.role}-${index}`}
                  message={message}
                />
              ))}

              {loading && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mt: 2,
                    p: 1.5,
                    width: "fit-content",
                    borderRadius: 2,
                    bgcolor: "#18233b",
                  }}
                >
                  <CircularProgress size={22} />

                  <Typography
                    sx={{ color: "#b9c2d0" }}
                  >
                    AI is generating a response...
                  </Typography>
                </Box>
              )}

              <div ref={messagesEndRef} />
            </Box>

            {/* ==================================================
                ERROR
            =================================================== */}

            {error && (
              <Box
                sx={{
                  px: 2,
                  pb: 1,
                  color: "#ff6b6b",
                  fontSize: 13,
                }}
              >
                {error}
              </Box>
            )}

            {/* ==================================================
                CHAT INPUT
                Controlled input so scanner question is editable.
            =================================================== */}

            <ChatInput
              value={inputDraft}
              onChange={setInputDraft}
              onSend={handleSend}
              loading={loading}
              placeholder={
                selectedVulnerability
                  ? "Edit the vulnerability-fix question before sending..."
                  : "Ask a cybersecurity question..."
              }
            />
          </Paper>
        </Box>
      </Box>
    </Layout>
  );
};

export default Chatbot;
