import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch(`/api/users/lookup?searchBy=personId&value=${personId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load profile.");
          return;
        }

        setPerson(data.person);

        const editableProfile = {
          personId: data.person.Person_ID || personId || "—",
          firstName: data.person.First_name || "",
          lastName: data.person.Last_name || "",
          username: data.person.username || "",
          email: data.person.email || "",
          phoneNumber: data.person.phone_number || "",
          birthday: data.person.birthday || "",
          streetAddress: data.person.street_address || "",
          zipCode: data.person.zip_code || "",
          accountStatus: data.person.account_status,
          borrowStatus: data.person.borrow_status,
        };

        setFormData(editableProfile);
        setOriginalData(editableProfile);
      } catch (err) {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [personId, token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString();
  };

  const getAccountStatus = (status) => (status === 1 ? "Active" : "Disabled");
  const getBorrowStatus = (status) => (status === 1 ? "Allowed" : "Restricted");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setError("");
  };

  const handleSave = async () => {
    try {
      setError("");

      const updatedProfile = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        birthday: formData.birthday,
        streetAddress: formData.streetAddress,
        zipCode: formData.zipCode,
      };

      const response = await apiFetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedProfile),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save profile changes.");
        return;
      }

      setOriginalData(formData);
      setPerson((prev) => ({
        ...prev,
        First_name: formData.firstName,
        Last_name: formData.lastName,
        username: formData.username,
        email: formData.email,
        phone_number: formData.phoneNumber,
        birthday: formData.birthday,
        street_address: formData.streetAddress,
        zip_code: formData.zipCode,
      }));
      setIsEditing(false);
    } catch (err) {
      setError("Failed to save profile changes.");
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      setError("");

      const response = await apiFetch("/api/users/deactivate", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to deactivate account.");
        return;
      }

      sessionStorage.clear();
      navigate("/login");
    } catch (err) {
      setError("Failed to deactivate account.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar />
        <p className="p-8 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar />
        <p className="p-8 text-red-600">Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-green-900">Personal Information</h1>

          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="bg-green-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="bg-green-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-8">Your account details.</p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-8 space-y-5">
          <LockedField label="Person ID" value={formData.personId || "—"} />

          <EditableField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            isEditing={isEditing}
          />

          <EditableField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            isEditing={isEditing}
          />

          <EditableField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            isEditing={isEditing}
          />

          <EditableField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            isEditing={isEditing}
          />

          <EditableField
            label="Phone Number"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            isEditing={isEditing}
          />

          <EditableField
            label="Birthday"
            name="birthday"
            type="date"
            value={formData.birthday ? formData.birthday.split("T")[0] : ""}
            onChange={handleChange}
            isEditing={isEditing}
            displayValue={formatDate(formData.birthday)}
          />

          <EditableField
            label="Street Address"
            name="streetAddress"
            value={formData.streetAddress}
            onChange={handleChange}
            isEditing={isEditing}
          />

          <EditableField
            label="Zip Code"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            isEditing={isEditing}
            maxLength={5}
          />

          <LockedField
            label="Account Status"
            value={getAccountStatus(formData.accountStatus)}
          />

          <LockedField
            label="Borrow Status"
            value={getBorrowStatus(formData.borrowStatus)}
          />

          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
            >
              Deactivate My Account
            </button>
          </div>
        </div>
      </div>

      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-red-700 mb-2">Deactivate Account</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to deactivate your account? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeactivateConfirm(false);
                  handleDeactivateAccount();
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  onChange,
  isEditing,
  type = "text",
  maxLength,
  displayValue,
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
        {label}
      </p>

      {isEditing ? (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          maxLength={maxLength}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-700"
        />
      ) : (
        <p className="text-gray-800 border-b border-gray-100 pb-2">
          {displayValue || value || "—"}
        </p>
      )}
    </div>
  );
}

function LockedField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {value}
      </p>
    </div>
  );
}