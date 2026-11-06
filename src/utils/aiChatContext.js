// ============================================================
// AI CHAT CONTEXT STORAGE
// ============================================================

const AI_CHAT_CONTEXT_KEY =
  "ai_cybersecurity_chat_context";


// ============================================================
// SAVE AI CHAT CONTEXT
// ============================================================

export const saveAIChatContext = (context) => {
  try {

    if (!context) {
      return;
    }


    const contextData = {
      ...context,

      createdAt:
        new Date().toISOString()
    };


    localStorage.setItem(
      AI_CHAT_CONTEXT_KEY,
      JSON.stringify(contextData)
    );


    console.log(
      "AI Chat Context Saved:",
      contextData
    );

  } catch (error) {

    console.error(
      "Failed to save AI chat context:",
      error
    );

  }
};


// ============================================================
// GET AI CHAT CONTEXT
// ============================================================

export const getAIChatContext = () => {
  try {

    const storedContext =
      localStorage.getItem(
        AI_CHAT_CONTEXT_KEY
      );


    if (!storedContext) {
      return null;
    }


    return JSON.parse(
      storedContext
    );

  } catch (error) {

    console.error(
      "Failed to load AI chat context:",
      error
    );


    return null;
  }
};


// ============================================================
// CLEAR AI CHAT CONTEXT
// ============================================================

export const clearAIChatContext = () => {
  try {

    localStorage.removeItem(
      AI_CHAT_CONTEXT_KEY
    );


    console.log(
      "AI Chat Context Cleared"
    );

  } catch (error) {

    console.error(
      "Failed to clear AI chat context:",
      error
    );

  }
};