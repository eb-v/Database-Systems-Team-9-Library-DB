import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function ManageStaffPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [listError, setListError] = useState("");
  const [listMessage, setListMessage] = useState("");

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", username: "",
    password: "", phone_number: "", birthday: "", staff_permissions: 1,
  });
  const [formMessage, setFormMessage] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    setListError("");
    try {
      const response = await apiFetch("/api/staff", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setListError(data.error || "Failed to load staff.");
        return;
      }
      setStaffList(data);
    } catch {
      setListError("Unable to connect to the server.");
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormMessage("");
    setFormLoading(true);
    try {
      const response = await apiFetch("/api/auth/register-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, staff_permissions: parseInt(form.staff_permissions) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormMessage(data.error || "Failed to register staff.");
        return;
      }
      setFormMessage("Staff member registered successfully.");
      setForm({ first_name: "", last_name: "", email: "", username: "", password: "", phone_number: "", birthday: "", staff_permissions: 1 });
      fetchStaff();
    } catch {
      setFormMessage("Unable to connect to the server.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdatePermissions = async (personId, newPermissions) => {
    setListMessage("");
    try {
      const response = await apiFetch(`/api/staff/${personId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staff_permissions: newPermissions }),
      });
      const data = await response.json();
      if (!response.ok) {
        setListMessage(data.error || "Failed to update permissions.");
        return;
      }
      setListMessage("Permissions updated successfully.");
      fetchStaff();
    } catch {
      setListMessage("Unable to connect to the server.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-green-900 mb-2">Manage Staff</h1>
        <p className="text-gray-600 mb-10">Register new staff members and manage permissions.</p>

        {/* Staff list */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Current Staff</h2>
          {loadingStaff && <p className="text-gray-600">Loading...</p>}
          {listError && <p className="text-red-600">{listError}</p>}
          {listMessage && (
            <p className={`mb-4 text-sm font-medium ${listMessage.includes("success") ? "text-green-700" : "text-red-600"}`}>
              {listMessage}
            </p>
          )}
          {!loadingStaff && !listError && (
            <div className="space-y-3">
              {staffList.map((member) => (
                <div key={member.Person_ID} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{member.First_name} {member.Last_name}</p>
                    <p className="text-sm text-gray-500">@{member.username} · {member.email}</p>
                    <p className="text-xs mt-1 font-semibold text-green-800 uppercase tracking-wide">
                      {Number(member.Staff_permissions) === 1 ? "Admin" : "Staff"}
                    </p>
                  </div>
                  <select
                    value={member.Staff_permissions}
                    onChange={(e) => handleUpdatePermissions(member.Person_ID, parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value={1}>Admin</option>
                    <option value={2}>Staff</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Register new staff */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Register New Staff</h2>
          <div className="bg-white rounded-2xl shadow-md p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" required>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Last Name" required>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Username" required>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Password" required>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    required
                  />
                </Field>
                <Field label="Phone Number">
                  <input
                    type="text"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  />
                </Field>
                <Field label="Birthday">
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  />
                </Field>
                <Field label="Role" required>
                  <select
                    value={form.staff_permissions}
                    onChange={(e) => setForm({ ...form, staff_permissions: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  >
                    <option value={1}>Admin</option>
                    <option value={2}>Staff</option>
                  </select>
                </Field>
              </div>

              {formMessage && (
                <p className={`text-sm font-medium ${formMessage.includes("success") ? "text-green-700" : "text-red-600"}`}>
                  {formMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-green-900 text-white py-3 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50"
              >
                {formLoading ? "Registering..." : "Register Staff Member"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}
