import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      } catch (err) {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  const getAccountStatus = (status) => status === 1 ? "Active" : "Disabled";
  const getBorrowStatus = (status) => status === 1 ? "Allowed" : "Restricted";

  if (loading) return <div className="min-h-screen bg-gray-100"><NavigationBar /><p className="p-8 text-gray-600">Loading...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-100"><NavigationBar /><p className="p-8 text-red-600">{error}</p></div>;

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

        <h1 className="text-3xl font-bold text-green-900 mb-2">Personal Information</h1>
        <p className="text-gray-600 mb-8">Your account details.</p>

        <div className="bg-white rounded-2xl shadow-md p-8 space-y-5">
          <ReadOnlyField label="First Name" value={person.First_name} />
          <ReadOnlyField label="Last Name" value={person.Last_name} />
          <ReadOnlyField label="Username" value={person.username} />
          <ReadOnlyField label="Email" value={person.email} />
          <ReadOnlyField label="Phone Number" value={person.phone_number || "—"} />
          <ReadOnlyField label="Birthday" value={formatDate(person.birthday)} />
          <ReadOnlyField label="Account Status" value={getAccountStatus(person.account_status)} />
          <ReadOnlyField label="Borrow Status" value={getBorrowStatus(person.borrow_status)} />
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">{label}</p>
      <p className="text-gray-800 border-b border-gray-100 pb-2">{value}</p>
    </div>
  );
}
