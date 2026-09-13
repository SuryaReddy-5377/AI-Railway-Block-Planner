import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import RailwayTimeline from "./components/RailwayTimeline";

const API_URL = "https://ai-railway-block-planner.onrender.com";

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const [stats, setStats] = useState({
    maintenance_tasks: 0,
    blocks: 0,
    trains: 0,
    assets: 0,
  });

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API_URL}/data-test`);

        if (!response.ok) {
          throw new Error("Failed to load railway data");
        }

        const data = await response.json();

        setStats({
          maintenance_tasks: data.maintenance_tasks ?? 0,
          blocks: data.blocks ?? 0,
          trains: data.trains ?? 0,
          assets: data.assets ?? 0,
        });
      } catch (err) {
        console.error("Dashboard data error:", err);

        setError(
          "Unable to load railway data from backend."
        );
      }
    };

    loadStats();
  }, []);

  /* =======================================================
     GENERATE AI PLAN
  ======================================================= */

  const generatePlan = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Generating AI maintenance plan...");

      const response = await fetch(
        `${API_URL}/generate-plan`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        let errorMessage = "";

        try {
          errorMessage = await response.text();
        } catch {
          errorMessage = "";
        }

        throw new Error(
          errorMessage
            ? `Backend error (${response.status}): ${errorMessage}`
            : `Backend error (${response.status})`
        );
      }

      const data = await response.json();

      console.log("AI PLAN:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      setPlan(data);
    } catch (err) {
      console.error("Generate plan error:", err);

      setError(
        err.message ||
          "Cannot connect to backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("token");

    window.location.href = "/login";
  };

  /* =======================================================
     HELPERS
  ======================================================= */

  const getPriorityClass = (priority) => {
    if (!priority) {
      return "";
    }

    return String(priority).toLowerCase();
  };

  const getStatusClass = (status) => {
    return String(status).toUpperCase() === "PLANNED"
      ? "planned"
      : "unplanned";
  };

  /* =======================================================
     PLAN DATA
  ======================================================= */

  const planRows = Array.isArray(plan?.plan)
    ? plan.plan
    : [];

  const plannedCount =
    plan?.planned_tasks ??
    planRows.filter(
      (item) =>
        String(item.status).toUpperCase() === "PLANNED"
    ).length;

  const unplannedCount =
    plan?.unplanned_tasks ??
    planRows.filter(
      (item) =>
        String(item.status).toUpperCase() !== "PLANNED"
    ).length;

  const totalTasks =
    plan?.total_tasks ?? stats.maintenance_tasks;

  const efficiency =
    plan?.planning_efficiency ??
    (totalTasks > 0
      ? Math.round((plannedCount / totalTasks) * 100)
      : 0);

  const unplannedRows = planRows.filter(
    (item) =>
      String(item.status).toUpperCase() !== "PLANNED"
  );

  /* =======================================================
     AI CONFIDENCE
  ======================================================= */

  const getConfidence = (item) => {
    if (
      item.ai_confidence !== undefined &&
      item.ai_confidence !== null
    ) {
      return `${item.ai_confidence}%`;
    }

    if (
      item.confidence !== undefined &&
      item.confidence !== null
    ) {
      return `${item.confidence}%`;
    }

    if (item.status !== "PLANNED") {
      return "—";
    }

    const score = Number(item.score || 0);

    const confidence =
      score > 0
        ? Math.min(
            99,
            Math.max(
              85,
              Math.round(80 + score / 5)
            )
          )
        : 90;

    return `${confidence}%`;
  };

  return (
    <div className="app">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="header">

        <div className="brand-section">

          <div className="brand-icon">
            🚆
          </div>

          <div>
            <h1>
              AI Railway Block Planner
            </h1>

            <p>
              AI-Powered Automatic Block Planning
              to Maximize Asset Availability
            </p>
          </div>

        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          System Online
        </div>

      </header>


      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="main">

        {/* =================================================
            DASHBOARD STATISTICS
        ================================================= */}

        <section className="stats">

          <div className="stat-card blue-card">

            <div className="stat-icon">
              📋
            </div>

            <div className="stat-title">
              Maintenance Tasks
            </div>

            <div className="stat-value">
              {stats.maintenance_tasks}
            </div>

            <div className="stat-description">
              Tasks requiring planning
            </div>

          </div>


          <div className="stat-card green-card">

            <div className="stat-icon">
              📅
            </div>

            <div className="stat-title">
              Available Blocks
            </div>

            <div className="stat-value">
              {stats.blocks}
            </div>

            <div className="stat-description">
              Maintenance windows
            </div>

          </div>


          <div className="stat-card purple-card">

            <div className="stat-icon">
              🚆
            </div>

            <div className="stat-title">
              Train Schedules
            </div>

            <div className="stat-value">
              {stats.trains}
            </div>

            <div className="stat-description">
              Train movements analyzed
            </div>

          </div>


          <div className="stat-card orange-card">

            <div className="stat-icon">
              🔧
            </div>

            <div className="stat-title">
              Assets
            </div>

            <div className="stat-value">
              {stats.assets}
            </div>

            <div className="stat-description">
              Railway assets monitored
            </div>

          </div>

        </section>


        {/* =================================================
            AI PLANNING ENGINE
        ================================================= */}

        <section className="planner-card">

          <div className="planner-content">

            <div className="ai-engine-icon">
              🤖
            </div>

            <div className="planner-text">

              <h2>
                AI Block Planning Engine
              </h2>

              <p>
                Analyze maintenance tasks, available
                railway blocks and train schedules to
                generate an optimized maintenance plan.
              </p>

            </div>

          </div>


          <button
            type="button"
            className="generate-button"
            onClick={generatePlan}
            disabled={loading}
          >
            {loading
              ? "⏳ Generating..."
              : "⚡ Generate Optimal Plan"}
          </button>

        </section>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="error">
            ⚠️ {error}
          </div>
        )}


        {/* =================================================
            GENERATED PLAN
        ================================================= */}

        {plan && (

          <section className="results">

            {/* =============================================
                RESULT HEADER
            ============================================= */}

            <div className="results-header">

              <div>

                <h2>
                  📊 AI Generated Maintenance Plan
                </h2>

                <p>
                  Recommended allocation of maintenance
                  tasks to available railway blocks.
                </p>

              </div>


              <div className="plan-summary">

                <div className="summary-box">
                  <span>
                    Planned
                  </span>

                  <strong className="success-text">
                    {plannedCount}
                  </strong>
                </div>


                <div className="summary-box">
                  <span>
                    Unplanned
                  </span>

                  <strong className="danger-text">
                    {unplannedCount}
                  </strong>
                </div>


                <div className="summary-box">
                  <span>
                    Efficiency
                  </span>

                  <strong className="confidence-text">
                    {efficiency}%
                  </strong>
                </div>

              </div>

            </div>


            {/* =============================================
                AI SUMMARY
            ============================================= */}

            <div className="ai-summary">

              <div className="ai-summary-icon">
                AI
              </div>

              <div>

                <h3>
                  AI Planning Summary
                </h3>

                <p>
                  The AI analyzed{" "}
                  <strong>
                    {totalTasks}
                  </strong>{" "}
                  maintenance tasks against{" "}
                  <strong>
                    {stats.blocks}
                  </strong>{" "}
                  available railway blocks and{" "}
                  <strong>
                    {stats.trains}
                  </strong>{" "}
                  train movements.
                </p>

                <p>
                  <strong className="success-text">
                    {plannedCount}
                  </strong>{" "}
                  tasks were successfully scheduled,
                  while{" "}
                  <strong className="danger-text">
                    {unplannedCount}
                  </strong>{" "}
                  tasks could not be assigned to a
                  feasible maintenance window.
                </p>

              </div>

            </div>


            {/* =============================================
                PLAN TABLE
            ============================================= */}

            <div className="table-container">

              <table>

                <thead>

                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Section</th>
                    <th>Duration</th>
                    <th>Recommended Block</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>AI Confidence</th>
                  </tr>

                </thead>


                <tbody>

                  {planRows.map((item, index) => (

                    <tr
                      key={
                        item.task_id ||
                        `task-${index}`
                      }
                    >

                      <td>
                        <strong>
                          {item.task_id || "—"}
                        </strong>
                      </td>


                      <td>
                        <span
                          className={`priority-badge ${getPriorityClass(
                            item.priority
                          )}`}
                        >
                          {item.priority || "N/A"}
                        </span>
                      </td>


                      <td>
                        {item.section || "—"}
                      </td>


                      <td>
                        {item.duration_hours ?? "—"} hrs
                      </td>


                      <td>
                        <strong>
                          {item.recommended_block || "—"}
                        </strong>
                      </td>


                      <td>
                        {item.block_start &&
                        item.block_end
                          ? `${item.block_start} → ${item.block_end}`
                          : "—"}
                      </td>


                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {item.status || "UNPLANNED"}
                        </span>
                      </td>


                      <td>
                        <span className="confidence-badge">
                          {getConfidence(item)}
                        </span>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>


            {/* =============================================
                PLANNING DECISION
            ============================================= */}

            <div className="decision-section">

              <h2>
                🧠 Planning Decision
              </h2>

              <p>
                The planner evaluates each maintenance task
                against available blocks and train schedules
                before selecting a suitable maintenance window.
              </p>


              <div className="decision-grid">

                <div className="decision-card">

                  <div className="decision-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Section Compatibility
                    </strong>

                    <p>
                      Task and maintenance block must belong
                      to the required railway section.
                    </p>

                  </div>

                </div>


                <div className="decision-card">

                  <div className="decision-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Duration Check
                    </strong>

                    <p>
                      Available block duration must be enough
                      for the maintenance task.
                    </p>

                  </div>

                </div>


                <div className="decision-card">

                  <div className="decision-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Train Conflict Check
                    </strong>

                    <p>
                      Blocks conflicting with train movement
                      are rejected.
                    </p>

                  </div>

                </div>


                <div className="decision-card">

                  <div className="decision-icon">
                    ✓
                  </div>

                  <div>

                    <strong>
                      AI Optimization
                    </strong>

                    <p>
                      The AI evaluates suitable task-block
                      combinations and provides a confidence score.
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* =============================================
                UNPLANNED TASKS
            ============================================= */}

            {unplannedRows.length > 0 && (

              <div className="attention-section">

                <h2>
                  ⚠️ Tasks Requiring Attention
                </h2>

                <p>
                  These tasks could not be assigned to the
                  currently available maintenance blocks.
                </p>


                <div className="attention-list">

                  {unplannedRows.map(
                    (item, index) => (

                      <div
                        className="attention-card"
                        key={
                          item.task_id ||
                          `attention-${index}`
                        }
                      >

                        <div className="attention-top">

                          <strong>
                            {item.task_id}
                          </strong>

                          <span
                            className={`priority-badge ${getPriorityClass(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>

                        </div>


                        <p>
                          {item.reason ||
                            "No feasible block found."}
                        </p>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

          </section>

        )}


        {/* =================================================
            RAILWAY TIMELINE
        ================================================= */}

        <RailwayTimeline
          plan={plan}
        />


        {/* =================================================
            HOW AI WORKS
        ================================================= */}

        <section className="how-it-works">

          <div className="how-header">

            <div className="how-icon">
              ⚙️
            </div>

            <h2>
              How the AI Planner Works
            </h2>

          </div>


          <div className="steps">

            <div className="step">

              <div className="step-number">
                1
              </div>

              <h3>
                Analyze Tasks
              </h3>

              <p>
                Analyze maintenance requirements,
                priority, section and required duration.
              </p>

            </div>


            <div className="step">

              <div className="step-number">
                2
              </div>

              <h3>
                Check Feasibility
              </h3>

              <p>
                Check block availability, duration
                and train movement conflicts.
              </p>

            </div>


            <div className="step">

              <div className="step-number">
                3
              </div>

              <h3>
                AI Evaluation
              </h3>

              <p>
                Evaluate suitable task-block combinations
                using the planning engine.
              </p>

            </div>


            <div className="step">

              <div className="step-number">
                4
              </div>

              <h3>
                Generate Plan
              </h3>

              <p>
                Produce a practical maintenance schedule
                with AI planning results.
              </p>

            </div>

          </div>

        </section>

      </main>


      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="footer">

        <strong>
          SIH26027
        </strong>

        <span>
          AI-Powered Automatic Block Planning
        </span>

        <button
          type="button"
          onClick={logout}
        >
          Logout
        </button>

      </footer>

    </div>
  );
}


/* =========================================================
   APPLICATION ROUTER
========================================================= */

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          path="/register"
          element={
            <Register />
          }
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;