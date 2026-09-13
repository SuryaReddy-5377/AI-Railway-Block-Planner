import { useState } from "react";

const API_URL = "https://ai-railway-block-planner.onrender.com";

function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!usernameOrEmail.trim()) {
      setError("Please enter your username or email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username_or_email: usernameOrEmail,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Login failed");
      }

      localStorage.setItem(
        "railwayUser",
        JSON.stringify(data)
      );

      setSuccess("Login successful!");

      if (onLogin) {
        onLogin(data);
      }
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!usernameOrEmail.trim()) {
      setError("Please enter a username.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/register`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: usernameOrEmail,
            email: email,
            password: password,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || "Registration failed"
        );
      }

      setSuccess(
        "Registration successful! You can now sign in."
      );

      setUsernameOrEmail("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsRegister(false);
        setSuccess("");
      }, 1200);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SWITCH LOGIN / REGISTER
  // =====================================================

  const switchMode = () => {
    setIsRegister(!isRegister);

    setUsernameOrEmail("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setError("");
    setSuccess("");
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="auth-page">

      {/* Background overlay */}
      <div className="background-overlay"></div>

      <div
        className={`auth-card ${
          isRegister ? "register-card" : ""
        }`}
      >

        {/* Railway logo */}
        <div className="railway-logo">
          🚆
        </div>

        <h1>
          AI Railway Block Planner
        </h1>

        <p className="subtitle">
          Railway Maintenance Management System
        </p>

        {/* Welcome section */}
        <div className="welcome-section">
          <h2>
            {isRegister
              ? "Create Account"
              : "Welcome Back"}
          </h2>

          <p>
            {isRegister
              ? "Create your railway operations account."
              : "Sign in to continue to your railway operations portal."}
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={
            isRegister
              ? handleRegister
              : handleLogin
          }
        >

          {/* USERNAME */}
          <div className="form-group">
            <label>
              {isRegister
                ? "Username"
                : "Username or Email"}
            </label>

            <div className="input-container">

              <span className="input-icon">
                👤
              </span>

              <input
                type="text"
                value={usernameOrEmail}
                onChange={(event) =>
                  setUsernameOrEmail(
                    event.target.value
                  )
                }
                placeholder={
                  isRegister
                    ? "Enter username"
                    : "Enter username or email"
                }
              />

            </div>
          </div>

          {/* EMAIL */}
          {isRegister && (
            <div className="form-group">

              <label>Email</label>

              <div className="input-container">

                <span className="input-icon">
                  ✉️
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter email"
                />

              </div>

            </div>
          )}

          {/* PASSWORD */}
          <div className="form-group">

            <label>Password</label>

            <div className="input-container">

              <span className="input-icon">
                🔒
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter password"
              />

            </div>

          </div>

          {/* CONFIRM PASSWORD */}
          {isRegister && (
            <div className="form-group">

              <label>
                Confirm Password
              </label>

              <div className="input-container">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm password"
                />

              </div>

            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="message error">
              ⚠️ {error}
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="message success">
              ✓ {success}
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            className="main-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
              ? "🔒 Create Account"
              : "🔒 Sign In"}
          </button>

        </form>

        {/* SWITCH */}
        <div className="account-switch">

          {isRegister ? (
            <>
              Already have an account?

              <button
                type="button"
                onClick={switchMode}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New user?

              <button
                type="button"
                onClick={switchMode}
              >
                Register
              </button>
            </>
          )}

        </div>

        <div className="bottom-line"></div>

        <div className="secure-text">
          Secure Railway Operations Portal
        </div>

      </div>

    </div>
  );
}

export default Auth;