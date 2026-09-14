import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import RailwayTimeline from "./components/RailwayTimeline";
import Login from "./pages/Login";
import Register from "./pages/Register";

const API_URL = "https://ai-railway-block-planner.onrender.com";

const EMPTY = {
  tasks: {
    task_id: "",
    department: "",
    asset_type: "",
    section: "",
    maintenance_type: "",
    duration_hours: "",
    priority: "Medium",
    due_date: "",
    condition: "Good",
    required_block_type: "Normal",
  },

  trains: {
    train_id: "",
    train_name: "",
    section: "",
    arrival_time: "",
    departure_time: "",
  },

  blocks: {
    block_id: "",
    section: "",
    start_time: "",
    end_time: "",
    duration_hours: "",
    block_type: "Normal",
    status: "Available",
  },

  assets: {
    asset_id: "",
    asset_type: "",
    section: "",
    condition: "Good",
  },
};

const NAMES = {
  tasks: "🛠️ Tasks",
  trains: "🚆 Trains",
  blocks: "🛤️ Blocks",
  assets: "⚙️ Assets",
};

const URLS = {
  tasks: "/tasks",
  trains: "/trains",
  blocks: "/blocks",
  assets: "/assets",
};

const OPTIONS = {
  priority: ["Critical", "High", "Medium", "Low"],
  condition: ["Good", "Fair", "Poor", "Critical"],
  required_block_type: ["Normal", "Power", "Traffic"],
  block_type: ["Normal", "Power", "Traffic"],
  status: ["Available", "Occupied", "Maintenance"],
};

const BASE_OPTIONS = {
  department: ["engineering", "traction", "signal_telecom"],
  asset_type: [
    "track",
    "signal",
    "traction",
    "overhead_equipment",
    "point_machine",
  ],
  section: ["A", "B", "C", "D", "E", "F", "G", "H"],
  maintenance_type: [
    "inspection",
    "repair",
    "replacement",
    "preventive_maintenance",
    "corrective_maintenance",
  ],
};

function App() {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  const [stats, setStats] = useState({
    maintenance_tasks: 0,
    blocks: 0,
    trains: 0,
    assets: 0,
  });

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [manager, setManager] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  // --------------------------------------------------
  // LOGIN STATE
  // --------------------------------------------------

  useEffect(() => {
    const updateLogin = () => {
      setLoggedIn(
        localStorage.getItem("isLoggedIn") === "true"
      );
    };

    window.addEventListener("storage", updateLogin);
    window.addEventListener("focus", updateLogin);

    return () => {
      window.removeEventListener("storage", updateLogin);
      window.removeEventListener("focus", updateLogin);
    };
  }, []);

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  const loadStats = async () => {
    try {
      const response = await fetch(
        `${API_URL}/data-test`
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || "Unable to load statistics");
      }

      const data = JSON.parse(text);

      setStats({
        maintenance_tasks:
          data.maintenance_tasks || 0,

        blocks:
          data.blocks || 0,

        trains:
          data.trains || 0,

        assets:
          data.assets || 0,
      });

    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Unable to load railway data."
      );
    }
  };

  useEffect(() => {
    if (loggedIn) {
      loadStats();
    }
  }, [loggedIn]);

  // --------------------------------------------------
  // LOAD RECORDS
  // --------------------------------------------------

  const loadRecords = async (type) => {
    if (!type) return;

    setManagerLoading(true);

    try {
      const response = await fetch(
        `${API_URL}${URLS[type]}`
      );

      const text = await response.text();

      if (!response.ok) {
        let detail = text;

        try {
          detail =
            JSON.parse(text).detail || text;
        } catch {}

        throw new Error(
          detail || "Unable to load records."
        );
      }

      const data = JSON.parse(text);

      // Backend returns an object such as { tasks: [...] },
      // { trains: [...] }, { blocks: [...] } or { assets: [...] }.
      // Older frontend code expected a bare array, which is why
      // "No records found" appeared even after a successful save.
      const list =
        Array.isArray(data)
          ? data
          : Array.isArray(data[type])
          ? data[type]
          : Array.isArray(data.records)
          ? data.records
          : [];

      setRecords(list);

    } catch (err) {
      console.error(err);

      setRecords([]);

      setError(
  err.message === "Failed to fetch"
    ? "Unable to connect to Railway Data Service."
    : err.message || "Unable to load records."
);
    } finally {
      setManagerLoading(false);
    }
  };

  // --------------------------------------------------
  // SELECT OPTIONS
  // --------------------------------------------------

  const getOptions = (fieldName) => {
    const fromSavedData = records
      .map((item) => item?.[fieldName])
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
      )
      .map((value) => String(value));

    return [
      ...new Set([
        ...(BASE_OPTIONS[fieldName] || []),
        ...fromSavedData,
      ]),
    ];
  };

  // --------------------------------------------------
  // OPEN MANAGER
  // --------------------------------------------------

  const openManager = async (type) => {
    setManager(type);

    setForm({
      ...EMPTY[type],
    });

    setEditingId(null);
    setError("");
    setMessage("");


    await loadRecords(type);
  };

  // --------------------------------------------------
  // FORM INPUT
  // --------------------------------------------------

  const handleInput = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // GET ID
  // --------------------------------------------------

  const getIdForType = (type, item) => {
    if (type === "tasks") return item?.task_id;
    if (type === "trains") return item?.train_id;
    if (type === "blocks") return item?.block_id;
    if (type === "assets") return item?.asset_id;
    return "";
  };

  const getId = (item) => {
    if (manager === "tasks") {
      return item.task_id;
    }

    if (manager === "trains") {
      return item.train_id;
    }

    if (manager === "blocks") {
      return item.block_id;
    }

    if (manager === "assets") {
      return item.asset_id;
    }

    return "";
  };

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  const saveData = async (event) => {
    event.preventDefault();

    if (!manager) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = { ...form };

      if (manager === "tasks" || manager === "blocks") {
        payload.duration_hours = Number(payload.duration_hours);
        if (!Number.isFinite(payload.duration_hours) || payload.duration_hours <= 0) {
          throw new Error("Duration must be greater than 0.");
        }
      }

      const isEditing = editingId !== null;
      const idField = {
        tasks: "task_id",
        trains: "train_id",
        blocks: "block_id",
        assets: "asset_id",
      }[manager];

      const url = isEditing
        ? `${API_URL}${URLS[manager]}/${encodeURIComponent(editingId)}`
        : `${API_URL}${URLS[manager]}`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      if (!response.ok) {
        let detail = text;

        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || parsed.message || text;
        } catch {}

        throw new Error(detail || "Backend rejected the data.");
      }

      let savedRecord = payload;

      try {
        const parsed = JSON.parse(text);
        savedRecord =
          parsed.task ||
          parsed.train ||
          parsed.block ||
          parsed.asset ||
          payload;
      } catch {}

      /*
       * Update the visible table locally immediately.
       * We deliberately do NOT make a second GET request here.
       *
       * This fixes the old false "Failed to fetch" situation where
       * POST succeeded but the follow-up GET failed because of CORS.
       */
      setRecords((previous) => {
        if (!isEditing) {
          return [...previous, savedRecord];
        }

        return previous.map((item) =>
          String(item?.[idField]) === String(editingId)
            ? { ...item, ...savedRecord }
            : item
        );
      });

      setForm({ ...EMPTY[manager] });
      setEditingId(null);

      setMessage(
        isEditing
          ? "Data updated successfully."
          : "Data added successfully."
      );

      /*
       * Statistics are helpful but must never turn a successful
       * database write into a displayed save error.
       */
      try {
        await loadStats();
      } catch (statsError) {
        console.warn("Statistics refresh failed:", statsError);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to save data.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // EDIT
  // --------------------------------------------------

  const editData = (item) => {
    const id = getId(item);

    setEditingId(id);

    setForm({
      ...EMPTY[manager],
      ...item,

      duration_hours:
        item.duration_hours !==
        undefined
          ? String(
              item.duration_hours
            )
          : "",
    });

    setError("");
    setMessage("");

    if (manager === "tasks") {
      }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const deleteData = async (item) => {
    const id = getId(item);

    if (!id) return;

    const confirmed = window.confirm(`Delete ${id}?`);
    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}${URLS[manager]}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      const text = await response.text();

      if (!response.ok) {
        let detail = text;

        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || parsed.message || text;
        } catch {}

        throw new Error(detail || "Unable to delete data.");
      }

      /*
       * Update the visible table locally instead of depending on a
       * second GET request. This keeps delete reliable even if a
       * browser-side GET has a temporary CORS/network problem.
       */
      setRecords((previous) =>
        previous.filter(
          (record) => String(getIdForType(manager, record)) !== String(id)
        )
      );

      if (editingId === id) {
        setEditingId(null);
        setForm({ ...EMPTY[manager] });
      }

      setMessage(`${id} deleted successfully.`);

      try {
        await loadStats();
      } catch (statsError) {
        console.warn("Statistics refresh failed:", statsError);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to delete data.");
    }
  };

  // --------------------------------------------------
  // CANCEL EDIT
  // --------------------------------------------------

  const cancelEdit = () => {
    setEditingId(null);

    setForm({
      ...EMPTY[manager],
    });


    setError("");
    setMessage("");
  };

  // --------------------------------------------------
  // EXCEL UPLOAD
  // --------------------------------------------------

  const uploadExcel = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/upload-excel`, {
        method: "POST",
        body: formData,
      });

      const text = await response.text();

      if (!response.ok) {
        let detail = text;

        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || parsed.message || text;
        } catch {}

        throw new Error(detail || "Excel upload failed.");
      }

      let imported = null;

      try {
        imported = JSON.parse(text).imported || null;
      } catch {}

      setMessage(
        imported
          ? `Excel uploaded successfully — ${imported.maintenance_tasks || 0} tasks, ${imported.available_blocks || 0} blocks, ${imported.train_schedule || 0} trains and ${imported.assets || 0} assets imported.`
          : "Excel uploaded successfully."
      );

      try {
        await loadStats();
      } catch (statsError) {
        console.warn("Statistics refresh failed:", statsError);
      }

      /*
       * Refresh the open manager if possible, but a refresh problem
       * must not turn a successful Excel import into an error.
       */
      if (manager) {
        try {
          await loadRecords(manager);
        } catch (recordsError) {
          console.warn("Manager refresh failed:", recordsError);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Excel upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // --------------------------------------------------
  // GENERATE PLAN
  // --------------------------------------------------

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    setPlan(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const response = await fetch(`${API_URL}/generate-plan`, {
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        let detail = text;

        try {
          const parsed = JSON.parse(text);
          detail = parsed.detail || parsed.message || text;
        } catch {}

        throw new Error(detail || "Unable to generate plan.");
      }

      const data = JSON.parse(text);

      if (data.status === "error" || data.error) {
        throw new Error(data.error || "The planning engine could not generate a plan.");
      }

      setPlan(data);
    } catch (err) {
      console.error(err);

      if (err?.name === "AbortError") {
        setError(
          "Plan generation took too long. The backend planning engine was stopped after 30 seconds."
        );
      } else {
        setError(err.message || "Unable to generate plan.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const logout = () => {
    localStorage.removeItem(
      "isLoggedIn"
    );

    localStorage.removeItem(
      "username"
    );

    setLoggedIn(false);

    window.history.pushState(
      {},
      "",
      "/"
    );
  };

  // --------------------------------------------------
  // AI DECISION CONFIDENCE
  // --------------------------------------------------

  const getConfidence = (item) => {
    if (
      item?.ai_confidence !== undefined &&
      item?.ai_confidence !== null
    ) {
      return `${item.ai_confidence}%`;
    }

    return "—";
  };

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  if (!loggedIn) {
  if (location.pathname === "/register") {
    return <Register />;
  }

  return <Login />;
}

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <h1>
            🚆 AI Railway Block Planner
          </h1>

          <p>
            AI-Powered Automatic Block
            Planning to Maximize Asset
            Availability
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: "15px",
          }}
        >

          <div className="system-status">
            <span className="status-dot"></span>
            System Online
          </div>

          <button
            onClick={logout}
            style={
              buttonStyle
            }
          >
            Logout
          </button>

        </div>

      </header>

      <main className="main">

        {/* ==================================
            STATS
            ================================== */}

        <section className="stats">

          <Stat
            title="Maintenance Tasks"
            value={
              stats.maintenance_tasks
            }
            description="Tasks requiring planning"
          />

          <Stat
            title="Available Blocks"
            value={
              stats.blocks
            }
            description="Maintenance windows"
          />

          <Stat
            title="Train Schedules"
            value={
              stats.trains
            }
            description="Train movements analyzed"
          />

          <Stat
            title="Assets"
            value={
              stats.assets
            }
            description="Railway assets monitored"
          />

        </section>

        {/* ==================================
            DATA MANAGEMENT
            ================================== */}

        <section className="planner-card">

          <div className="planner-content">

            <div className="ai-icon">
              🗂️
            </div>

            <div>

              <h2
                style={
                  visibleHeading
                }
              >
                Railway Data Management
              </h2>

              <p
                style={
                  visibleText
                }
              >
                Add, edit, delete or upload
                railway data directly from
                the website.
              </p>

            </div>

          </div>

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap: "10px",
              justifyContent:
                "flex-end",
            }}
          >

            {/* EXCEL */}

            <label
              style={
                uploadButton
              }
            >
              {uploading
                ? "⏳ Uploading..."
                : "📥 Upload Excel"}

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={
                  uploadExcel
                }
                disabled={
                  uploading
                }
                style={{
                  display:
                    "none",
                }}
              />
            </label>

            {/* MANAGERS */}

            {Object.keys(
              NAMES
            ).map((type) => (

              <button
                key={type}
                onClick={() =>
                  openManager(
                    type
                  )
                }
                style={{
                  ...buttonStyle,
                  background:
                    manager ===
                    type
                      ? "rgba(30,110,210,0.9)"
                      : "rgba(8,30,65,0.78)",
                }}
              >
                {NAMES[type]}
              </button>

            ))}

          </div>

        </section>

        {/* ==================================
            SUCCESS / ERROR
            ================================== */}

        {message && (
          <div
            style={{
              marginTop:
                "15px",
              padding:
                "12px 16px",
              borderRadius:
                "10px",
              background:
                "rgba(20,110,70,0.35)",
              border:
                "1px solid rgba(100,220,160,0.4)",
              color:
                "#ffffff",
              fontWeight:
                600,
            }}
          >
            ✅ {message}
          </div>
        )}

        {error && (
          <div
            className="error"
            style={{
              marginTop:
                "15px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ==================================
            MANAGER
            ================================== */}

        {manager && (

          <section
            className="results"
            style={{
              marginTop:
                "20px",
              padding:
                "24px",
            }}
          >

            <div className="results-header">

              <div>

                <h2
                  style={
                    visibleHeading
                  }
                >
                  {NAMES[manager]}
                  {" "}Management
                </h2>

                <p
                  style={
                    visibleText
                  }
                >
                  Enter data below and
                  click Add Data.
                </p>

              </div>

              <button
                onClick={() => {
                  setManager(
                    null
                  );
                  setRecords(
                    []
                  );
                  setError(
                    ""
                  );
                  setMessage(
                    ""
                  );
                }}
                style={
                  buttonStyle
                }
              >
                ✕ Close
              </button>

            </div>

            {/* ==================================
                FORM
                ================================== */}

            <form
              onSubmit={
                saveData
              }
              style={{
                marginTop:
                  "20px",
              }}
            >

              {/* TASK FORM */}

              {manager === "tasks" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(190px,1fr))",
                    gap: "12px",
                  }}
                >
                  <Field
                    name="task_id"
                    value={form.task_id}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="department"
                    value={form.department}
                    onChange={handleInput}
                    options={getOptions("department")}
                  />

                  <SelectField
                    name="asset_type"
                    value={form.asset_type}
                    onChange={handleInput}
                    options={getOptions("asset_type")}
                  />

                  <SelectField
                    name="section"
                    value={form.section}
                    onChange={handleInput}
                    options={getOptions("section")}
                  />

                  <SelectField
                    name="maintenance_type"
                    value={form.maintenance_type}
                    onChange={handleInput}
                    options={getOptions("maintenance_type")}
                  />

                  <Field
                    name="duration_hours"
                    value={form.duration_hours}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="priority"
                    value={form.priority}
                    onChange={handleInput}
                    options={OPTIONS.priority}
                  />

                  <Field
                    name="due_date"
                    value={form.due_date}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="condition"
                    value={form.condition}
                    onChange={handleInput}
                    options={OPTIONS.condition}
                  />

                  <SelectField
                    name="required_block_type"
                    value={form.required_block_type}
                    onChange={handleInput}
                    options={OPTIONS.required_block_type}
                  />
                </div>
              )}

              {/* TRAIN FORM */}

              {manager === "trains" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(190px,1fr))",
                    gap: "12px",
                  }}
                >
                  <Field
                    name="train_id"
                    value={form.train_id}
                    onChange={handleInput}
                  />

                  <Field
                    name="train_name"
                    value={form.train_name}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="section"
                    value={form.section}
                    onChange={handleInput}
                    options={getOptions("section")}
                  />

                  <Field
                    name="arrival_time"
                    value={form.arrival_time}
                    onChange={handleInput}
                  />

                  <Field
                    name="departure_time"
                    value={form.departure_time}
                    onChange={handleInput}
                  />
                </div>
              )}

              {/* BLOCK FORM */}

              {manager === "blocks" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(190px,1fr))",
                    gap: "12px",
                  }}
                >
                  <Field
                    name="block_id"
                    value={form.block_id}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="section"
                    value={form.section}
                    onChange={handleInput}
                    options={getOptions("section")}
                  />

                  <Field
                    name="start_time"
                    value={form.start_time}
                    onChange={handleInput}
                  />

                  <Field
                    name="end_time"
                    value={form.end_time}
                    onChange={handleInput}
                  />

                  <Field
                    name="duration_hours"
                    value={form.duration_hours}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="block_type"
                    value={form.block_type}
                    onChange={handleInput}
                    options={OPTIONS.block_type}
                  />

                  <SelectField
                    name="status"
                    value={form.status}
                    onChange={handleInput}
                    options={OPTIONS.status}
                  />
                </div>
              )}

              {/* ASSET FORM */}

              {manager === "assets" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(190px,1fr))",
                    gap: "12px",
                  }}
                >
                  <Field
                    name="asset_id"
                    value={form.asset_id}
                    onChange={handleInput}
                  />

                  <SelectField
                    name="asset_type"
                    value={form.asset_type}
                    onChange={handleInput}
                    options={getOptions("asset_type")}
                  />

                  <SelectField
                    name="section"
                    value={form.section}
                    onChange={handleInput}
                    options={getOptions("section")}
                  />

                  <SelectField
                    name="condition"
                    value={form.condition}
                    onChange={handleInput}
                    options={OPTIONS.condition}
                  />
                </div>
              )}

              {/* BUTTONS */}

              <div
                style={{
                  display:
                    "flex",
                  gap: "10px",
                  marginTop:
                    "18px",
                }}
              >

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="generate-button"
                >
                  {saving
                    ? "⏳ Saving..."
                    : editingId !== null
                    ? "💾 Update Data"
                    : `➕ Add ${manager === "tasks"
                        ? "Task"
                        : manager === "trains"
                        ? "Train"
                        : manager === "blocks"
                        ? "Block"
                        : "Asset"}`}
                </button>

                {editingId !==
                  null && (

                  <button
                    type="button"
                    onClick={
                      cancelEdit
                    }
                    style={
                      buttonStyle
                    }
                  >
                    Cancel Edit
                  </button>
                )}

              </div>

            </form>

            {/* ==================================
                SAVED DATA
                ================================== */}

            <div
              style={{
                marginTop:
                  "28px",
              }}
            >

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "12px",
                }}
              >

                <h3
                  style={{
                    color:
                      "#ffffff",
                    margin:
                      0,
                  }}
                >
                  📋 Saved{" "}
                  {manager
                    .charAt(0)
                    .toUpperCase() +
                    manager.slice(1)}
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    loadRecords(
                      manager
                    )
                  }
                  style={
                    buttonStyle
                  }
                >
                  🔄 Refresh
                </button>

              </div>

              <div
                className="table-container"
              >

                {managerLoading ? (

                  <p
                    style={
                      visibleText
                    }
                  >
                    ⏳ Loading records...
                  </p>

                ) : records.length ===
                  0 ? (

                  <p
                    style={
                      visibleText
                    }
                  >
                    No records found.
                  </p>

                ) : (

                  <table>

                    <thead>

                      <tr>

                        <th
                          style={
                            tableHeading
                          }
                        >
                          ID
                        </th>

                        {Object.keys(
                          records[0]
                        )
                          .filter(
                            (key) =>
                              key !==
                              "_id"
                          )
                          .slice(
                            1,
                            6
                          )
                          .map(
                            (key) => (

                              <th
                                key={
                                  key
                                }
                                style={
                                  tableHeading
                                }
                              >
                                {key
                                  .replaceAll(
                                    "_",
                                    " "
                                  )
                                  .toUpperCase()}
                              </th>

                            )
                          )}

                        <th
                          style={
                            tableHeading
                          }
                        >
                          ACTIONS
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {records.map(
                        (
                          item,
                          index
                        ) => {

                          const id =
                            getId(
                              item
                            );

                          const keys =
                            Object.keys(
                              item
                            )
                              .filter(
                                (key) =>
                                  key !==
                                  "_id"
                              )
                              .slice(
                                1,
                                6
                              );

                          return (
                            <tr
                              key={
                                id ||
                                index
                              }
                            >

                              <td>
                                <strong>
                                  {
                                    id
                                  }
                                </strong>
                              </td>

                              {keys.map(
                                (
                                  key
                                ) => (

                                  <td
                                    key={
                                      key
                                    }
                                  >
                                    {String(
                                      item[
                                        key
                                      ] ??
                                        "—"
                                    )}
                                  </td>

                                )
                              )}

                              <td>

                                <button
                                  onClick={() =>
                                    editData(
                                      item
                                    )
                                  }
                                  style={
                                    smallButton
                                  }
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  onClick={() =>
                                    deleteData(
                                      item
                                    )
                                  }
                                  style={{
                                    ...smallButton,
                                    background:
                                      "rgba(150,30,40,0.75)",
                                    marginLeft:
                                      "6px",
                                  }}
                                >
                                  🗑️ Delete
                                </button>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                )}

              </div>

            </div>

          </section>
        )}

        {/* ==================================
            AI PLANNER
            ================================== */}

        <section className="planner-card">

          <div className="planner-content">

            <div className="ai-icon">
              🤖
            </div>

            <div>

              <h2
                style={
                  visibleHeading
                }
              >
                AI Block Planning Engine
              </h2>

              <p
                style={
                  visibleText
                }
              >
                Analyze maintenance tasks,
                available railway blocks and
                train schedules to generate an
                optimized maintenance plan.
              </p>

            </div>

          </div>

          <button
            className="generate-button"
            onClick={
              generatePlan
            }
            disabled={
              loading
            }
          >
            {loading
              ? "⏳ Generating..."
              : "⚡ Generate Optimal Plan"}
          </button>

        </section>

        {/* ==================================
            PLAN
            ================================== */}

        {plan && (

          <section className="results">

            <div className="results-header">

              <div>

                <h2
                  style={
                    visibleHeading
                  }
                >
                  📊 AI Generated
                  Maintenance Plan
                </h2>

                <p
                  style={
                    visibleText
                  }
                >
                  Recommended allocation of
                  maintenance tasks to available
                  railway blocks.
                </p>

              </div>

              <div
                className="plan-summary"
              >

                <div>
                  <span>
                    Planned
                  </span>

                  <strong className="success-text">
                    {
                      plan.planned_tasks
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Unplanned
                  </span>

                  <strong className="danger-text">
                    {
                      plan.unplanned_tasks
                    }
                  </strong>
                </div>

              </div>

            </div>

            <div className="table-container">

              <table>

                <thead>

                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Section</th>
                    <th>Asset</th>
                    <th>Duration</th>
                    <th>
                      Recommended Block
                    </th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>AI Confidence</th>
                  </tr>

                </thead>

                <tbody>

                  {plan.plan.map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={
                          item.task_id ||
                          index
                        }
                      >

                        <td>
                          <strong>
                            {
                              item.task_id
                            }
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`priority-badge ${
                              item.priority
                                ? String(
                                    item.priority
                                  ).toLowerCase()
                                : ""
                            }`}
                          >
                            {
                              item.priority
                            }
                          </span>
                        </td>

                        <td>
                          {
                            item.section
                          }
                        </td>

                        <td>
                          <strong>
                            {item.asset_id || "—"}
                          </strong>
                          {item.asset_condition ? (
                            <div style={{ fontSize: "11px", opacity: 0.75 }}>
                              {item.asset_condition}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          {
                            item.duration_hours
                          } hrs
                        </td>

                        <td>
                          <strong>
                            {
                              item.recommended_block ||
                              "—"
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            item.block_start &&
                            item.block_end
                              ? `${item.block_start} → ${item.block_end}`
                              : "—"
                          }
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              item.status ===
                              "PLANNED"
                                ? "planned"
                                : "unplanned"
                            }`}
                          >
                            {
                              item.status
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: "58px",
                              padding: "5px 9px",
                              borderRadius: "999px",
                              textAlign: "center",
                              fontWeight: 700,
                              color: "#ffffff",
                              background:
                                getConfidence(item) === "—"
                                  ? "rgba(120,135,160,0.35)"
                                  : "rgba(30,130,210,0.35)",
                              border:
                                getConfidence(item) === "—"
                                  ? "1px solid rgba(180,190,210,0.25)"
                                  : "1px solid rgba(90,190,255,0.45)",
                            }}
                          >
                            {getConfidence(item)}
                          </span>
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

            <div className="decision-section">

              <h2
                style={
                  visibleHeading
                }
              >
                🧠 Planning Decision
              </h2>

              <p
                style={
                  visibleText
                }
              >
                The planner evaluates each
                maintenance task against
                available blocks and train
                schedules before selecting a
                suitable maintenance window.
              </p>

              <div className="decision-grid">

                <Decision
                  title="Section Compatibility"
                  text="Task and maintenance block must belong to the required railway section."
                />

                <Decision
                  title="Duration Check"
                  text="Available block duration must be enough for the maintenance task."
                />

                <Decision
                  title="Train Conflict Check"
                  text="Blocks conflicting with train movement are rejected."
                />

                <Decision
                  title="Priority Optimization"
                  text="Higher-priority maintenance tasks are considered first."
                />

              </div>

            </div>

          </section>
        )}

        <RailwayTimeline
          plan={plan}
        />

        {/* ==================================
            HOW IT WORKS
            ================================== */}

        <section className="how-it-works">

          <h2
            style={
              visibleHeading
            }
          >
            ⚙️ How the AI Planner Works
          </h2>

          <div className="steps">

            <Step
              number="1"
              title="Analyze Tasks"
              text="Analyze maintenance requirements, priority, section and required duration."
            />

            <Step
              number="2"
              title="Check Feasibility"
              text="Check block availability, duration and train movement conflicts."
            />

            <Step
              number="3"
              title="Optimize"
              text="Select the most suitable available block for every maintenance task."
            />

            <Step
              number="4"
              title="Generate Plan"
              text="Produce a practical maintenance schedule for railway operations."
            />

          </div>

        </section>

      </main>

      <footer className="footer">

        <strong>
          SIH26027
        </strong>

        <span>
          AI-Powered Automatic Block Planning
        </span>

      </footer>

    </div>
  );
}

/* ==========================================
   FIELD
   ========================================== */

function Field({
  name,
  value,
  onChange,
}) {
  const label =
    name
      .replaceAll("_", " ")
      .replace(
        /\\b\\w/g,
        (c) => c.toUpperCase()
      );

  return (
    <label style={labelStyle}>
      {label}

      <input
        name={name}
        value={value ?? ""}
        onChange={onChange}
        type={
          name.includes("date")
            ? "date"
            : name.includes("time")
            ? "time"
            : name === "duration_hours"
            ? "number"
            : "text"
        }
        step={
          name === "duration_hours"
            ? "0.5"
            : undefined
        }
        required
        style={inputStyle}
      />
    </label>
  );
}

function SelectField({
  name,
  value,
  onChange,
  options = [],
}) {
  const label =
    name
      .replaceAll("_", " ")
      .replace(
        /\\b\\w/g,
        (c) => c.toUpperCase()
      );

  return (
    <label style={labelStyle}>
      {label}

      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required
        style={inputStyle}
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ==========================================
   SMALL COMPONENTS
   ========================================== */

function Stat({
  title,
  value,
  description,
}) {
  return (
    <div className="stat-card">

      <div className="stat-title">
        {title}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-description">
        {description}
      </div>

    </div>
  );
}

function Decision({
  title,
  text,
}) {
  return (
    <div className="decision-card">

      <span>✓</span>

      <div>

        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>

      </div>

    </div>
  );
}

function Step({
  number,
  title,
  text,
}) {
  return (
    <div className="step">

      <div className="step-number">
        {number}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  );
}

/* ==========================================
   STYLES
   ========================================== */

const visibleHeading = {
  color: "#ffffff",
};

const visibleText = {
  color:
    "rgba(255,255,255,0.9)",
};

const labelStyle = {
  display: "flex",
  flexDirection:
    "column",
  gap: "6px",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "13px",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box",
  padding:
    "10px 12px",
  borderRadius: "9px",
  border:
    "1px solid rgba(255,255,255,0.25)",
  background:
    "rgba(5,20,45,0.85)",
  color: "#ffffff",
  outline: "none",
};

const buttonStyle = {
  padding:
    "10px 16px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.25)",
  background:
    "rgba(8,30,65,0.78)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};

const uploadButton = {
  ...buttonStyle,
  background:
    "rgba(20,80,150,0.85)",
  display:
    "inline-flex",
  alignItems:
    "center",
};

const smallButton = {
  padding:
    "7px 10px",
  borderRadius: "7px",
  border:
    "1px solid rgba(255,255,255,0.2)",
  background:
    "rgba(20,80,140,0.75)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
};

const tableHeading = {
  color: "#ffffff",
};

export default App;