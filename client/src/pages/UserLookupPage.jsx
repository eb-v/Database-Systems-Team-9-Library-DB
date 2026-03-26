import { useState } from "react";
import NavigationBar from "../components/NavigationBar";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const getAccountStatusLabel = (status) => {
  return Number(status) === 1 ? "Active" : "Inactive";
};

const getBorrowStatusLabel = (status) => {
  return Number(status) === 1 ? "Good Standing" : "Restricted";
};

export default function UserLookupPage() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState("personId");
  const [searchValue, setSearchValue] = useState("");
  const [userRecord, setUserRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const token = sessionStorage.getItem("token");

  const handleSearch = async () => {
    setMessage("");
    setUserRecord(null);
    setSummary(null);

    if (!searchValue.trim()) {
      setMessage("Please enter a search value.");
      return;
    }

    try {
      const response = await apiFetch(
        `/api/users/lookup?searchBy=${searchType}&value=${encodeURIComponent(searchValue)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load user record.");
        return;
      }

      setUserRecord(data.person);
      setSummary(data.summary);
      setMessage("User record loaded.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/*back button*/}
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        {/*title*/}
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          User Lookup
        </h1>
        {/*description*/}
        <p className="text-gray-600 mb-8">
          Search for a library guest and view their current borrowing and fee information.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-8">
          {/*search card*/}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Search User
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search By
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option value="personId">Person ID</option>
                <option value="username">Username</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Value <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={`Enter ${searchType}`}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <button
              className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>

          {/*user summary section*/}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              User Details
            </h2>

            {userRecord ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label="Username" value={userRecord.username} />
                <ReadOnlyField label="Person ID" value={userRecord.Person_ID} />
                <ReadOnlyField
                  label="Name"
                  value={`${userRecord.First_name} ${userRecord.Last_name}`}
                />
                <ReadOnlyField label="Email" value={userRecord.email} />
                <ReadOnlyField
                  label="Account Status"
                  value={getAccountStatusLabel(userRecord.account_status)}
                />
                <ReadOnlyField
                  label="Borrow Status"
                  value={getBorrowStatusLabel(userRecord.borrow_status)}
                />
              </div>
            ) : (
              <p className="text-gray-500">No user loaded yet.</p>
            )}
          </div>

          {/*account summary section*/}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Account Summary
            </h2>

            {summary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                  title="Borrowed Items"
                  value={summary.activeBorrows}
                  description="Items currently checked out"
                />
                <SummaryCard
                  title="Outstanding Fees"
                  value={`$${summary.unpaidFeeTotal}`}
                  description={`${summary.unpaidFeeCount} unpaid fee(s)`}
                />
                <SummaryCard
                  title="Active Holds"
                  value={summary.activeHolds}
                  description="Items currently on hold"
                />
              </div>
            ) : (
              <p className="text-gray-500">No summary available yet.</p>
            )}
          </div>

          {userRecord && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate(`/holds?personId=${userRecord.Person_ID}&staffView=true`)}
                  className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800"
                >
                  View Holds
                </button>

                <button
                  onClick={() => navigate(`/return-borrow?personId=${userRecord.Person_ID}&staffView=true`)}
                  className="bg-green-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-900"
                >
                  View Borrowed Items
                </button>

                <button
                  onClick={() => navigate(`/fees?personId=${userRecord.Person_ID}&staffView=true`)}
                  className="bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800"
                >
                  View Fees
                </button>
              </div>
            </div>
          )}

          {message && (
            <p
              className={`text-sm font-medium ${
                message.includes("loaded") ? "text-green-700" : "text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <p className="text-sm text-gray-500 pt-2">
            <span className="text-red-600 font-semibold">*</span> indicates a
            required field.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-green-900 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}