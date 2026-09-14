import { useEffect, useState } from "react";

const API_URL = "https://ai-railway-block-planner.onrender.com";

const EMPTY_TASK = {
  task_id: "",
  department: "engineering",
  asset_type: "track",
  section: "A",
  maintenance_type: "inspection",
  duration_hours: "",
  priority: "Medium",
  due_date: "",
  condition: "Good",
  required_block_type: "Normal",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  borderRadius: "10px",
  border: "1px solid rgba(130,190,255,0.35)",
  background: "rgba(5,25,55,0.55)",
  color: "#fff",
  outline: "none",
};

const buttonStyle = {
  border: "1px solid rgba(130,190,255,0.35)",
  borderRadius: "10px",
  padding: "10px 16px",
  background: "rgba(8,55,105,0.78)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

function Field({ label, name, value, onChange, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: "6px", color: "#fff", fontWeight: 600 }}>
      <span>{label}</span>
      <input style={inputStyle} type={type} name={name} value={value ?? ""} onChange={onChange} required />
    </label>
  );
}

function AdminUserManagement() {
  const token = sessionStorage.getItem("token") || "";
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadUsers = async () => {
    const response = await fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Unable to load users.");
    setUsers(data.users || []);
  };

  useEffect(() => {
    loadUsers().catch((e) => setError(e.message));
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_URL}/admin/users`, { method: "POST", headers, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to create user.");
      setMessage("User created successfully.");
      setForm({ username: "", email: "", password: "", role: "user" });
      await loadUsers();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const changeRole = async (username, role) => {
    setError(""); setMessage("");
    try {
      const response = await fetch(`${API_URL}/admin/users/${encodeURIComponent(username)}/role?role=${encodeURIComponent(role)}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to update role.");
      setMessage("Role updated successfully.");
      await loadUsers();
    } catch (e) { setError(e.message); }
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Delete user ${username}?`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`${API_URL}/admin/users/${encodeURIComponent(username)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to delete user.");
      setMessage("User deleted successfully.");
      await loadUsers();
    } catch (e) { setError(e.message); }
  };

  return (
    <section className="results" style={{ marginTop: 20, padding: 24 }}>
      <div className="results-header">
        <div>
          <h2 style={{ color: "#fff" }}>👥 User Management</h2>
          <p style={{ color: "rgba(255,255,255,0.85)" }}>Create users and control Admin/User access.</p>
        </div>
      </div>
      <form onSubmit={createUser} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 18 }}>
        <Field label="Username" name="username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
        <Field label="Email" name="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Field label="Password" name="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <label style={{ display: "grid", gap: 6, color: "#fff", fontWeight: 600 }}><span>Role</span><select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select></label>
        <button style={{ ...buttonStyle, alignSelf: "end" }} disabled={loading}>{loading ? "Creating..." : "➕ Create User"}</button>
      </form>
      {message && <p style={{ color: "#b8ffd8", fontWeight: 700 }}>{message}</p>}
      {error && <p style={{ color: "#ffb5b5", fontWeight: 700 }}>{error}</p>}
      <div className="table-container" style={{ marginTop: 18 }}>
        <table><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>{users.map(user => <tr key={user.username}><td>{user.username}</td><td>{user.email}</td><td><strong>{user.role || "user"}</strong></td><td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={buttonStyle} onClick={() => changeRole(user.username, user.role === "admin" ? "user" : "admin")}>{user.role === "admin" ? "Make User" : "Make Admin"}</button><button style={{ ...buttonStyle, background: "rgba(120,30,45,0.7)" }} onClick={() => deleteUser(user.username)}>Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function UserDashboard() {
  const token = sessionStorage.getItem("token") || "";
  const username = sessionStorage.getItem("username") || "User";
  const [task, setTask] = useState(EMPTY_TASK);
  const [tasks, setTasks] = useState([]);
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    const [taskResponse, planResponse] = await Promise.all([
      fetch(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/plans/latest`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const taskData = await taskResponse.json();
    if (taskResponse.ok) setTasks(taskData.tasks || []);
    if (planResponse.ok) {
      const planData = await planResponse.json();
      setPlan(planData.plan || null);
    }
  };

  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const submitTask = async (e) => {
    e.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const payload = { ...task, duration_hours: Number(task.duration_hours) };
      const response = await fetch(`${API_URL}/tasks`, { method: "POST", headers: authHeaders, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to submit task.");
      setMessage("Maintenance task submitted successfully. An admin/planner can include it in the next AI plan.");
      setTask({ ...EMPTY_TASK });
      await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="app">
      <header className="header"><div><h1>🚆 AI Railway Block Planner</h1><p>User Maintenance Portal</p></div><div className="system-status"><span className="status-dot"></span> System Online <span style={{ marginLeft: 14 }}>👤 {username} · USER</span></div></header>
      <main className="main">
        <section className="planner-card"><div className="planner-content"><div className="ai-icon">👷</div><div><h2 style={{ color: "#fff" }}>Maintenance Request</h2><p style={{ color: "rgba(255,255,255,0.85)" }}>Submit a maintenance requirement for the railway planning team.</p></div></div>
          <form onSubmit={submitTask} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 18 }}>
            <Field label="Task ID" name="task_id" value={task.task_id} onChange={e => setTask({ ...task, task_id: e.target.value })} />
            <Field label="Department" name="department" value={task.department} onChange={e => setTask({ ...task, department: e.target.value })} />
            <Field label="Asset Type" name="asset_type" value={task.asset_type} onChange={e => setTask({ ...task, asset_type: e.target.value })} />
            <Field label="Section" name="section" value={task.section} onChange={e => setTask({ ...task, section: e.target.value })} />
            <Field label="Maintenance Type" name="maintenance_type" value={task.maintenance_type} onChange={e => setTask({ ...task, maintenance_type: e.target.value })} />
            <Field label="Duration (hours)" name="duration_hours" type="number" value={task.duration_hours} onChange={e => setTask({ ...task, duration_hours: e.target.value })} />
            <Field label="Priority" name="priority" value={task.priority} onChange={e => setTask({ ...task, priority: e.target.value })} />
            <Field label="Due Date" name="due_date" type="date" value={task.due_date} onChange={e => setTask({ ...task, due_date: e.target.value })} />
            <Field label="Condition" name="condition" value={task.condition} onChange={e => setTask({ ...task, condition: e.target.value })} />
            <Field label="Required Block Type" name="required_block_type" value={task.required_block_type} onChange={e => setTask({ ...task, required_block_type: e.target.value })} />
            <button style={{ ...buttonStyle, alignSelf: "end" }} disabled={saving}>{saving ? "Submitting..." : "📨 Submit Maintenance Task"}</button>
          </form>
          {message && <p style={{ color: "#b8ffd8", fontWeight: 700 }}>{message}</p>}{error && <p style={{ color: "#ffb5b5", fontWeight: 700 }}>{error}</p>}
        </section>
        <section className="results" style={{ marginTop: 20, padding: 24 }}><h2 style={{ color: "#fff" }}>📋 My Submitted Tasks</h2><div className="table-container"><table><thead><tr><th>Task</th><th>Section</th><th>Priority</th><th>Due Date</th><th>Status</th></tr></thead><tbody>{tasks.length ? tasks.map(t => <tr key={t.task_id}><td>{t.task_id}</td><td>{t.section}</td><td>{t.priority}</td><td>{t.due_date}</td><td>{t.status || "SUBMITTED"}</td></tr>) : <tr><td colSpan="5">No tasks submitted yet.</td></tr>}</tbody></table></div></section>
        <section className="results" style={{ marginTop: 20, padding: 24 }}><h2 style={{ color: "#fff" }}>🤖 Latest Approved AI Plan</h2>{plan?.plan?.length ? <div className="table-container"><table><thead><tr><th>Task</th><th>Block</th><th>Time</th><th>Status</th></tr></thead><tbody>{plan.plan.map((p, i) => <tr key={p.task_id || i}><td>{p.task_id}</td><td>{p.recommended_block || "—"}</td><td>{p.block_start && p.block_end ? `${p.block_start} → ${p.block_end}` : "—"}</td><td>{p.status}</td></tr>)}</tbody></table></div> : <p style={{ color: "rgba(255,255,255,0.85)" }}>No approved AI plan is available yet.</p>}</section>
      </main>
    </div>
  );
}

function AdminPlanApproval() {
  const token = sessionStorage.getItem("token") || "";
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch(`${API_URL}/admin/plans/latest`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Unable to load latest plan.");
    setPlan(data.plan || null);
  };

  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const approve = async () => {
    if (!plan?._id) return;
    setError(""); setMessage("");
    const response = await fetch(`${API_URL}/admin/plans/${encodeURIComponent(plan._id)}/approve`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) { setError(data.detail || "Unable to approve plan."); return; }
    setMessage("AI plan approved. Users can now view it.");
    await load();
  };

  return <section className="results" style={{ marginTop: 20, padding: 24 }}><div className="results-header"><div><h2 style={{ color: "#fff" }}>✅ AI Plan Review</h2><p style={{ color: "rgba(255,255,255,0.85)" }}>Review the latest generated plan before releasing it to users.</p></div></div>{message && <p style={{ color: "#b8ffd8", fontWeight: 700 }}>{message}</p>}{error && <p style={{ color: "#ffb5b5", fontWeight: 700 }}>{error}</p>}{plan ? <><p style={{ color: "#fff" }}><strong>Status:</strong> {plan.status}</p>{plan.plan?.length ? <div className="table-container"><table><thead><tr><th>Task</th><th>Block</th><th>Time</th><th>Status</th></tr></thead><tbody>{plan.plan.map((item, i) => <tr key={item.task_id || i}><td>{item.task_id}</td><td>{item.recommended_block || "—"}</td><td>{item.block_start && item.block_end ? `${item.block_start} → ${item.block_end}` : "—"}</td><td>{item.status}</td></tr>)}</tbody></table></div> : <p style={{ color: "#fff" }}>The generated plan contains no assignments.</p>}{plan.status !== "APPROVED" && <button style={{ ...buttonStyle, marginTop: 14 }} onClick={approve}>Approve Plan for Users</button>}</> : <p style={{ color: "rgba(255,255,255,0.85)" }}>No generated plan yet. Generate a plan below first.</p>}</section>;
}

export { AdminUserManagement, AdminPlanApproval, UserDashboard };
