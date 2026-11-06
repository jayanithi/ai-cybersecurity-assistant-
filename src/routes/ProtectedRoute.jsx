import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const {
    user,
    authLoading,
  } = useAuth();

  const location = useLocation();

  // =====================================================
  // DEBUG INFORMATION
  // =====================================================
  // Refresh நேரத்தில் ProtectedRoute என்ன state-ல் இருக்கிறது
  // என்பதை Console-ல் பார்க்க இது உதவும்.
  // =====================================================

  console.log("🔐 ProtectedRoute:", {
    user,
    authLoading,
    pathname: location.pathname,
    token: localStorage.getItem("token"),
    username: localStorage.getItem("username"),
    role: localStorage.getItem("role"),
  });

  // =====================================================
  // 1. AUTHENTICATION IS STILL BEING RESTORED
  // =====================================================

  if (authLoading) {
    console.log(
      "⏳ ProtectedRoute: Waiting for authentication restore..."
    );

    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
        }}
      >
        Loading...
      </div>
    );
  }

  // =====================================================
  // 2. AUTHENTICATION CHECK COMPLETED
  // =====================================================

  console.log("✅ ProtectedRoute: Authentication check completed");

  // =====================================================
  // 3. USER NOT AUTHENTICATED
  // =====================================================
  // IMPORTANT:
  // Redirect only when:
  //
  // authLoading === false
  // AND
  // user doesn't exist
  // OR
  // user.token doesn't exist
  // =====================================================

  if (!user || !user.token) {
    console.log(
      "🚨 ProtectedRoute: REDIRECTING TO LOGIN"
    );

    console.log("🚨 Redirect details:", {
      user,
      authLoading,
      pathname: location.pathname,
      localStorageToken: localStorage.getItem("token"),
      username: localStorage.getItem("username"),
      role: localStorage.getItem("role"),
    });

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // =====================================================
  // 4. USER IS AUTHENTICATED
  // =====================================================

  console.log(
    "🟢 ProtectedRoute: USER AUTHENTICATED"
  );

  console.log("🟢 Authenticated user:", {
    username: user.username,
    role: user.role,
    hasToken: Boolean(user.token),
    pathname: location.pathname,
  });

  // =====================================================
  // 5. RENDER REQUESTED PAGE
  // =====================================================

  return children;
};

export default ProtectedRoute;