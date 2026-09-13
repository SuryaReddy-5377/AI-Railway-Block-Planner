import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

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

  // ---------------------------------------------
  // Handle input changes
  // ---------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  // ---------------------------------------------
  // Register
  // ---------------------------------------------
  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // -------------------------------------------
    // Validation
    // -------------------------------------------

    if (!formData.username.trim()) {
      setError("Please enter a username.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!formData.password) {
      setError("Please enter a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (
      formData.password !== formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // -----------------------------------------
      // Send registration request to FastAPI
      // -----------------------------------------

      const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
          }),
        }
      );

      // -----------------------------------------
      // Read response
      // -----------------------------------------

      const contentType =
        response.headers.get("content-type");

      let data;

      if (
        contentType &&
        contentType.includes("application/json")
      ) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      console.log("REGISTER RESPONSE:", data);

      // -----------------------------------------
      // Backend error
      // -----------------------------------------

      if (!response.ok) {
        let message = "Registration failed.";

        if (typeof data === "string") {
          message = data;
        } else if (data?.detail) {
          if (typeof data.detail === "string") {
            message = data.detail;
          } else {
            message = JSON.stringify(data.detail);
          }
        } else if (data?.message) {
          message = data.message;
        }

        setError(message);
        return;
      }

      // -----------------------------------------
      // Registration successful
      // -----------------------------------------

      setSuccess(
        "Account created successfully! Redirecting to login..."
      );

      // Clear password fields
      setFormData((previous) => ({
        ...previous,
        password: "",
        confirmPassword: "",
      }));

      // -----------------------------------------
      // Go to Login after short delay
      // -----------------------------------------

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);

    } catch (err) {
      console.error("REGISTER ERROR:", err);

      setError(
        "Unable to connect to the backend. Make sure your FastAPI server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* Background overlay */}
      <div className="auth-overlay"></div>

      {/* Glass Register Card */}
      <div className="auth-card register-card">

        {/* Logo */}
        <div className="auth-logo">
          🚆
        </div>

        {/* Main title */}
        <h1>AI Railway Block Planner</h1>

        <p className="auth-system-title">
          Railway Maintenance Management System
        </p>

        <h2>Create Account</h2>

        <p className="auth-description">
          Create your account to access railway maintenance planning.
        </p>

        {/* Register Form */}
        <form onSubmit={handleRegister}>

          {/* Username */}
          <div className="form-group">

            <label htmlFor="username">
              Username
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                👤
              </span>

              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Create username"
                autoComplete="username"
              />

            </div>

          </div>

          {/* Email */}
          <div className="form-group">

            <label htmlFor="email">
              Email
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                ✉️
              </span>

              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                autoComplete="email"
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
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                autoComplete="new-password"
              />

            </div>

          </div>

          {/* Confirm Password */}
          <div className="form-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                autoComplete="new-password"
              />

            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          {/* Create Account */}
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              "Creating Account..."
            ) : (
              <>
                🔒 Create Account
              </>
            )}
          </button>

        </form>

        {/* Login */}
        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">
            Sign In
          </Link>
        </p>

        <div className="auth-footer">
          Secure Railway Operations Portal
        </div>

      </div>

    </div>
  );
}

export default Register;