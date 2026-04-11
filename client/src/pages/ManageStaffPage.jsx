import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

const EMPTY_REGISTER_FORM = {
  first_name: "", last_name: "", email: "", username: "",
  password: "", phone_number: "", birthday: "",
};

export default function ManageStaffPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  // ── Staff list & search ──────────────────────────────────────────────────
  const [staffList,    setStaffList]    = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [listError,    setListError]    = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");

  // ── Selected staff + edit ────────────────────────────────────────────────
  const [selected,    setSelected]    = useState(null);   // full member object
  const [editForm,    setEditForm]    = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  // ── Register ─────────────────────────────────────────────────────────────
  const [registerForm,    setRegisterForm]    = useState(EMPTY_REGISTER_FORM);
  const [registerMessage, setRegisterMessage] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    setListError("");
    try {
      const r    = await apiFetch("/api/staff", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (!r.ok) { setListError(data.error || "Failed to load staff."); return; }
      setStaffList(data);
    } catch {
      setListError("Unable to connect to the server.");
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleSelect = (member) => {
    setSelected(member);
    setEditForm({
      first_name:   member.First_name,
      last_name:    member.Last_name,
      email:        member.email,
      username:     member.username,
      phone_number: member.phone_number || "",
    });
    setEditMessage("");
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    setEditMessage("");
    try {
      const r    = await apiFetch(`/api/staff/${selected.Person_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await r.json();
      if (!r.ok) { setEditMessage(data.error || "Failed to save changes."); return; }
      setEditMessage("Changes saved successfully.");
      await fetchStaff();
      // re-sync selected with updated data
      setSelected((prev) => ({ ...prev, ...editForm, First_name: editForm.first_name, Last_name: editForm.last_name }));
    } catch {
      setEditMessage("Unable to connect to the server.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterMessage("");
    setRegisterLoading(true);
    try {
      const r    = await apiFetch("/api/auth/register-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...registerForm, staff_permissions: 1 }),
      });
      const data = await r.json();
      if (!r.ok) { setRegisterMessage(data.error || "Failed to register staff."); return; }
      setRegisterMessage("Staff member registered successfully.");
      setRegisterForm(EMPTY_REGISTER_FORM);
      fetchStaff();
    } catch {
      setRegisterMessage("Unable to connect to the server.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const filtered = staffList.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.First_name?.toLowerCase().includes(q) ||
      m.Last_name?.toLowerCase().includes(q)  ||
      m.username?.toLowerCase().includes(q)   ||
      m.email?.toLowerCase().includes(q)      ||
      String(m.Person_ID).includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-green-900 mb-2">Manage Staff</h1>
        <p className="text-gray-600 mb-8">Search for a staff member to edit their profile, or register a new one.</p>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Left panel: search + edit ─────────────────────────────────── */}
          <div className="flex-1 space-y-6">

            {/* Search */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-semibold text-green-900">Search Staff</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelected(null); setEditMessage(""); }}
                placeholder="Search by name, username, email, or ID..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />

              {loadingStaff && <p className="text-sm text-gray-400 italic">Loading staff...</p>}
              {listError    && <p className="text-sm text-red-600">{listError}</p>}

              {!loadingStaff && !listError && searchQuery && (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 italic">No staff match your search.</p>
                  ) : (
                    filtered.map((m) => (
                      <button
                        key={m.Person_ID}
                        onClick={() => handleSelect(m)}
                        className={`w-full text-left px-4 py-3 hover:bg-green-50 flex justify-between items-center transition-colors ${selected?.Person_ID === m.Person_ID ? "bg-green-50" : ""}`}
                      >
                        <span className="font-semibold text-gray-800">{m.First_name} {m.Last_name}</span>
                        <span className="text-sm text-gray-500">
                          @{m.username} · {Number(m.Staff_permissions) === 2 ? "Admin" : "Staff"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Edit panel */}
            {selected && (
              <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-green-900">Edit Staff Profile</h2>
                    <p className="text-sm text-gray-500">
                      {selected.First_name} {selected.Last_name} · ID {selected.Person_ID} ·{" "}
                      <span className="font-semibold text-green-800 uppercase text-xs tracking-wide">
                        {Number(selected.Staff_permissions) === 2 ? "Admin" : "Staff"}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelected(null); setEditMessage(""); }}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </Field>
                  <Field label="Username">
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </Field>
                  <Field label="Phone Number">
                    <input
                      type="text"
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    />
                  </Field>
                </div>

                {editMessage && (
                  <p className={`text-sm font-medium ${editMessage.includes("success") ? "text-green-700" : "text-red-600"}`}>
                    {editMessage}
                  </p>
                )}

                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="w-full bg-green-900 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* ── Right panel: register ─────────────────────────────────────── */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-semibold text-green-900">Register New Staff</h2>

              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="First Name" required>
                  <input
                    type="text"
                    value={registerForm.first_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Last Name" required>
                  <input
                    type="text"
                    value={registerForm.last_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Username" required>
                  <input
                    type="text"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Password" required>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Phone Number">
                  <input
                    type="text"
                    value={registerForm.phone_number}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  />
                </Field>
                <Field label="Birthday">
                  <input
                    type="date"
                    value={registerForm.birthday}
                    onChange={(e) => setRegisterForm({ ...registerForm, birthday: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  />
                </Field>

                {registerMessage && (
                  <p className={`text-sm font-medium ${registerMessage.includes("success") ? "text-green-700" : "text-red-600"}`}>
                    {registerMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full bg-green-900 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
                >
                  {registerLoading ? "Registering..." : "Register Staff Member"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}
