import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // ==========================================
  // AUTH USER
  // ==========================================
  const [user, setUser] = useState(null);

  // ==========================================
  // AUTH INITIALIZATION
  // IMPORTANT:
  // ProtectedRoute must wait until localStorage
  // authentication state has been restored.
  // ==========================================
  const [authLoading, setAuthLoading] = useState(true);

  // ==========================================
  // RESTORE AUTH SESSION
  // Runs only once when application starts.
  // ==========================================
  useEffect(() => {
    let mounted = true;

    const restoreAuthSession = () => {
      try {
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");
        const role = localStorage.getItem("role");

        // --------------------------------------
        // TOKEN EXISTS
        // --------------------------------------
        if (token && token.trim() !== "") {
          if (mounted) {
            setUser({
              token,
              username: username || "",
              role: role || "user",
            });
          }
        } else {
          // ------------------------------------
          // NO TOKEN
          // ------------------------------------
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error(
          "❌ Authentication restore error:",
          error
        );

        if (mounted) {
          setUser(null);
        }
      } finally {
        // --------------------------------------
        // VERY IMPORTANT
        // Tell ProtectedRoute that the initial
        // authentication check is finished.
        // --------------------------------------
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    restoreAuthSession();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================
  const login = ({
    token,
    username,
    role,
  }) => {
    try {
      if (!token) {
        console.error(
          "❌ Login failed: token is missing"
        );
        return false;
      }

      const safeUsername = username || "";
      const safeRole = role || "user";

      // --------------------------------------
      // SAVE SESSION
      // --------------------------------------
      localStorage.setItem(
        "token",
        token
      );

      localStorage.setItem(
        "username",
        safeUsername
      );

      localStorage.setItem(
        "role",
        safeRole
      );

      // --------------------------------------
      // UPDATE REACT STATE
      // --------------------------------------
      setUser({
        token,
        username: safeUsername,
        role: safeRole,
      });

      return true;
    } catch (error) {
      console.error(
        "❌ Login storage error:",
        error
      );

      return false;
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const logout = () => {
    try {
      // --------------------------------------
      // CLEAR AUTH DATA ONLY
      // --------------------------------------
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");

      // --------------------------------------
      // CLEAR REACT AUTH STATE
      // --------------------------------------
      setUser(null);
    } catch (error) {
      console.error(
        "❌ Logout error:",
        error
      );
    }
  };

  // ==========================================
  // CONTEXT VALUE
  // ==========================================
  const contextValue = {
    user,
    login,
    logout,
    authLoading,

    // Optional compatibility field.
    // If any existing component uses `loading`,
    // it will continue to work.
    loading: authLoading,

    // Useful if another component wants to know
    // whether initial auth restoration finished.
    isAuthenticated: Boolean(user),
  };

  // ==========================================
  // PROVIDER
  // ==========================================
  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// USE AUTH
// ==========================================
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};

export default AuthContext;