import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE_URL = "https://ai-railway-block-planner.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const loginValue = username.trim();

    if (!loginValue) {
      setError("Please enter your username or email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      console.log("LOGIN: sending request...");

      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: loginValue,
            password,
          }),
          signal: controller.signal,
        }
      );

      window.clearTimeout(timeoutId);

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      console.log("LOGIN STATUS:", response.status);
      console.log("LOGIN RESPONSE:", data);

      if (!response.ok) {
        let message = "Login failed.";

        if (typeof data === "string" && data.trim()) {
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
        return;
      }

      console.log("LOGIN SUCCESSFUL");

      /*
       * IMPORTANT:
       * Use sessionStorage, not localStorage.
       * Closing the browser/tab will require login again.
       * Refreshing the page during the same session keeps login.
       */
      sessionStorage.setItem("isLoggedIn", "true");

      const returnedUsername =
        data?.user?.username || loginValue;

      sessionStorage.setItem(
        "username",
        String(returnedUsername)
      );

      if (data?.access_token) {
        sessionStorage.setItem(
          "token",
          data.access_token
        );
      }

      if (data?.token) {
        sessionStorage.setItem(
          "token",
          data.token
        );
      }

      /*
       * Remove old persistent login values created by
       * previous versions of the application.
       */
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("username");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");

      /*
       * Full navigation makes the new session state available
       * immediately to App.jsx.
       */
      window.location.replace("/dashboard");
    } catch (err) {
      window.clearTimeout(timeoutId);

      console.error("LOGIN ERROR:", err);

      if (err?.name === "AbortError") {
        setError(
          "The server took too long to respond. Please try again."
        );
      } else {
        setError(
          "Unable to connect to the backend. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-overlay"></div>

      <div className="auth-card">
        <div className="auth-logo">🚆</div>

        <h1>AI Railway Block Planner</h1>

        <p className="auth-system-title">
          Railway Maintenance Management System
        </p>

        <h2>Sign In</h2>

        <p className="auth-description">
          Sign in to access railway maintenance planning.
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">
              Username or Email
            </label>

            <div className="input-wrapper">
              <span className="input-icon">👤</span>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
                placeholder="Enter username or email"
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="input-wrapper">
              <span className="input-icon">🔒</span>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Signing In..." : "🔒 Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          New user?{" "}
          <Link to="/register">Register</Link>
        </p>

        <div className="auth-footer">
          Secure Railway Operations Portal
        </div>
      </div>
    </div>
  );
}

export default Login;
