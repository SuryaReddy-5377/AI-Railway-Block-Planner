import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE_URL = "https://ai-railway-block-planner.onrender.com";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const username = formData.username.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!username) {
      setError("Please enter a username.");
      return;
    }

    if (username.length < 3) {
      setError("Username must contain at least 3 characters.");
      return;
    }

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      console.log("REGISTER: sending request...");

      const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
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

      console.log("REGISTER STATUS:", response.status);
      console.log("REGISTER RESPONSE:", data);

      if (!response.ok) {
        let message = "Registration failed.";

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

      setSuccess(
        "Account created successfully! Redirecting to login..."
      );

      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      window.clearTimeout(timeoutId);

      console.error("REGISTER ERROR:", err);

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

      <div className="auth-card register-card">
        <div className="auth-logo">🚆</div>

        <h1>AI Railway Block Planner</h1>

        <p className="auth-system-title">
          Railway Maintenance Management System
        </p>

        <h2>Create Account</h2>

        <p className="auth-description">
          Create your account to access railway maintenance planning.
        </p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="username">Username</label>

            <div className="input-wrapper">
              <span className="input-icon">👤</span>

              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Create username"
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>

            <div className="input-wrapper">
              <span className="input-icon">✉️</span>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                autoComplete="email"
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
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="input-wrapper">
              <span className="input-icon">🔒</span>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "🔒 Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign In</Link>
        </p>

        <div className="auth-footer">
          Secure Railway Operations Portal
        </div>
      </div>
    </div>
  );
}

export default Register;
