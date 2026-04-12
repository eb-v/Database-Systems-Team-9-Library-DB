import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";
import Banner from "../components/Banner";

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
  const [editMessage, setEditMessage] = useState({ text: "", success: true });
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // ── Register ─────────────────────────────────────────────────────────────
  const [registerOpen,    setRegisterOpen]    = useState(false);
  const [registerForm,    setRegisterForm]    = useState(EMPTY_REGISTER_FORM);
  const [registerMessage, setRegisterMessage] = useState({ text: "", success: true });
  const [registerLoading, setRegisterLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
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
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSelect = (member) => {
    setSelected(member);
    setShowDeactivateConfirm(false);
    setEditForm({
      first_name:   member.First_name,
      last_name:    member.Last_name,
      email:        member.email,
      username:     member.username,
      phone_number: member.phone_number || "",
      birthday:     member.birthday ? member.birthday.split("T")[0] : "",
      password:     "",
    });
    setEditMessage({ text: "", success: true });
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;

  const handleSaveEdit = async () => {
    setEditMessage({ text: "", success: true });

    if (!editForm.first_name.trim()) return setEditMessage({ text: "First name is required.", success: false });
    if (!editForm.last_name.trim())  return setEditMessage({ text: "Last name is required.", success: false });
    if (!emailRegex.test(editForm.email)) return setEditMessage({ text: "Please enter a valid email address.", success: false });
    if (!phoneRegex.test(editForm.phone_number)) return setEditMessage({ text: "Please enter a valid phone number.", success: false });
    if (!editForm.birthday) return setEditMessage({ text: "Birthday is required.", success: false });
    if (new Date(editForm.birthday) > new Date()) return setEditMessage({ text: "Birthday cannot be in the future.", success: false });

    setEditLoading(true);
    setEditMessage({ text: "", success: true });
    try {
      const r    = await apiFetch(`/api/staff/${selected.Person_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await r.json();
      if (!r.ok) { setEditMessage({ text: data.error || "Failed to save changes.", success: false }); return; }
      setEditMessage({ text: "Changes saved successfully.", success: true });
      await fetchStaff();
      // re-sync selected with updated data
      setSelected((prev) => ({ ...prev, ...editForm, First_name: editForm.first_name, Last_name: editForm.last_name }));
    } catch {
      setEditMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeactivateStaff = async () => {
    if (!selected) return;

    setDeactivateLoading(true);
    setEditMessage({ text: "", success: true });

    try {
      const r = await apiFetch(`/api/staff/${selected.Person_ID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();

      if (!r.ok) {
        setEditMessage({ text: data.error || "Failed to deactivate staff member.", success: false });
        return;
      }

      setShowDeactivateConfirm(false);
      setSelected(null);
      setEditForm({});
      await fetchStaff();
    } catch {
      setEditMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterMessage({ text: "", success: true });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;

    if (!emailRegex.test(registerForm.email))
      return setRegisterMessage({ text: "Please enter a valid email address.", success: false });
    if (!phoneRegex.test(registerForm.phone_number))
      return setRegisterMessage({ text: "Please enter a valid phone number.", success: false });
    if (!registerForm.birthday)
      return setRegisterMessage({ text: "Birthday is required.", success: false });
    if (new Date(registerForm.birthday) > new Date())
      return setRegisterMessage({ text: "Birthday cannot be in the future.", success: false });

    setRegisterLoading(true);
    try {
      const r    = await apiFetch("/api/auth/register-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...registerForm, staff_permissions: 1 }),
      });
      const data = await r.json();
      if (!r.ok) { setRegisterMessage({ text: data.error || "Failed to register staff.", success: false }); return; }
      setRegisterMessage({ text: "Staff member registered successfully.", success: true });
      setRegisterForm(EMPTY_REGISTER_FORM);
      setRegisterOpen(false);
      fetchStaff();
    } catch {
      setRegisterMessage({ text: "Unable to connect to the server.", success: false });
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

        <div className="space-y-6 max-w-5xl">

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-green-900">Manage Staff</h1>
              <p className="text-gray-600 mt-1">Search for a staff member to edit their profile, or register a new one.</p>
            </div>
            <button
              onClick={() => { setRegisterOpen((o) => !o); setRegisterMessage({ text: "", success: true }); }}
              className="bg-green-800 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-900 shrink-0 ml-4"
            >
              + Register Staff
            </button>
          </div>

          {/* ── Register card ── */}
          {registerOpen && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-semibold text-green-900">Register New Staff</h2>
              <button
                onClick={() => { setRegisterOpen(false); setRegisterMessage({ text: "", success: true }); }}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="px-6 pb-6">
              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name" required>
                    <input type="text" value={registerForm.first_name} onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                  <Field label="Last Name" required>
                    <input type="text" value={registerForm.last_name} onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                  <Field label="Email" required>
                    <input type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                  <Field label="Username" required>
                    <input type="text" value={registerForm.username} onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                  <Field label="Password" required>
                    <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                  <Field label="Phone Number" required>
                    <input type="text" value={registerForm.phone_number} onChange={(e) => setRegisterForm({ ...registerForm, phone_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                  <Field label="Birthday" required>
                    <input type="date" value={registerForm.birthday} onChange={(e) => setRegisterForm({ ...registerForm, birthday: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
                  </Field>
                </div>
                <Banner message={registerMessage} onDismiss={() => setRegisterMessage({ text: "", success: true })} />
                <button type="submit" disabled={registerLoading} className="w-full bg-green-900 text-white py-3 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
                  {registerLoading ? "Registering..." : "Register Staff Member"}
                </button>
              </form>
            </div>
          </div>
          )}

          {/* ── Search + Edit ── */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-semibold text-green-900">Search Staff</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelected(null); setEditMessage({ text: "", success: true }); }}
                placeholder="Search by name, username, email, or ID..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />

              {loadingStaff && <p className="text-sm text-gray-400 italic">Loading staff...</p>}
              {listError    && <p className="text-sm text-red-600">{listError}</p>}

              {!loadingStaff && !listError && (
                <div className="divide-y border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
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

              {/* Edit panel */}
              {selected && (
                <div className="space-y-4">
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
                      onClick={() => { setSelected(null); setEditMessage({ text: "", success: true }); }}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name" required>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                        required
                      />
                    </Field>
                    <Field label="Last Name" required>
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                        required
                      />
                    </Field>
                    <Field label="Email" required>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                        required
                      />
                    </Field>
                    <Field label="Phone Number" required>
                      <input
                        type="text"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                        required
                      />
                    </Field>
                    <Field label="Birthday" required>
                      <input
                        type="date"
                        value={editForm.birthday}
                        onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                        required
                      />
                    </Field>
                  </div>

                  <Banner message={editMessage} onDismiss={() => setEditMessage({ text: "", success: true })} />

                  {showDeactivateConfirm && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                      <p className="text-sm font-semibold text-red-700">
                        Are you sure you want to deactivate this staff account?
                      </p>
                      <p className="mt-1 text-sm text-red-600">
                        The account will be disabled and removed from the staff list.
                      </p>
                      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setShowDeactivateConfirm(false)}
                          disabled={deactivateLoading}
                          className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          No, Keep Account
                        </button>
                        <button
                          type="button"
                          onClick={handleDeactivateStaff}
                          disabled={deactivateLoading}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deactivateLoading ? "Deactivating..." : "Yes, Deactivate"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleSaveEdit}
                      disabled={editLoading || deactivateLoading}
                      className="flex-1 rounded-lg bg-green-900 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(true)}
                      disabled={editLoading || deactivateLoading}
                      className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Deactivate Staff
                    </button>
                  </div>
                </div>
              )}
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
