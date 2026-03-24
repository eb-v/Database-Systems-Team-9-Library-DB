import { useState } from "react";
import NavigationBar from "../components/NavigationBar";

export default function UserLookupPage() {
  const [searchType, setSearchType] = useState("Person ID");
  const [searchValue, setSearchValue] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          User Lookup
        </h1>
        <p className="text-gray-600 mb-8">
          Search for a library guest and view their current borrowing and fee information.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-8">
          {/*search*/}
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
                <option>Person ID</option>
                <option>Userame</option>
                <option>Email</option>
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
              onClick={() => setMessage("User record loaded.")}
            >
              Search
            </button>
          </div>

          {/*user info*/}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              User Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadOnlyField label="Username" value="jdoe123" />
              <ReadOnlyField label="Person ID" value="102" />
              <ReadOnlyField label="Name" value="Jane Doe" />
              <ReadOnlyField label="Email" value="janedoe@email.com" />
              <ReadOnlyField label="Account Status" value="Active" />
              <ReadOnlyField label="Borrow Status" value="Good Standing" />
            </div>
          </div>

          {/*acc summary*/}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Account Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                title="Borrowed Items"
                value="2"
                description="Items currently checked out"
              />
              <SummaryCard
                title="Outstanding Fees"
                value="$15.00"
                description="Current amount owed"
              />
              <SummaryCard
                title="Active Holds"
                value="1"
                description="Items currently on hold"
              />
            </div>
          </div>

          {message && (
            <p className="text-sm text-green-700 font-medium">{message}</p>
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