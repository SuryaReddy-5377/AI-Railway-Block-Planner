import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE_URL = "https://ai-railway-block-planner.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!username.trim()) {
      setError("Please enter your username or email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const contentType = response.headers.get("content-type");

      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      console.log("LOGIN RESPONSE:", data);

      // -----------------------------
      // LOGIN FAILED
      // -----------------------------
      if (!response.ok) {
        let message = "Login failed.";

        if (typeof data === "string") {
          message = data;
        } else if (data?.detail) {
          message =
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail);
        } else if (data?.message) {
          message =
            typeof data.message === "string"
              ? data.message
              : JSON.stringify(data.message);
        }

        setError(message);
        setLoading(false);
        return;
      }

      // -----------------------------
      // LOGIN SUCCESSFUL
      // -----------------------------

      console.log("LOGIN SUCCESSFUL");

      // Save login information
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", username.trim());

      // Save token if backend provides one
      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      /*
       * IMPORTANT
       *
       * We wait until the backend confirms the login,
       * then navigate to the dashboard.
       */
     window.location.replace("/dashboard");

    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        "Unable to connect to the backend. Make sure your FastAPI server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-overlay"></div>

      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          🚆
        </div>

        {/* Main title */}
        <h1>AI Railway Block Planner</h1>

        <p className="auth-system-title">
          Railway Maintenance Management System
        </p>

        {/* Welcome */}
        <h2>Welcome Back</h2>

        <p className="auth-description">
          Sign in to continue to your railway operations portal.
        </p>

        <form onSubmit={handleLogin}>

          {/* Username */}
          <div className="form-group">

            <label htmlFor="username">
              Username or Email
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                👤
              </span>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter username or email"
                autoComplete="username"
              />

            </div>

          </div>

          {/* Password */}
          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter password"
                autoComplete="current-password"
              />

            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Signing In..." : "🔒 Sign In"}
          </button>

        </form>

        {/* Register */}
        <p className="auth-switch">
          New user?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

        <div className="auth-footer">
          Secure Railway Operations Portal
        </div>

      </div>
    </div>
  );
}

export default Login;