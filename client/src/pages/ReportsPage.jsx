import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import NavigationBar from "../components/NavigationBar";

const REPORT_OPTIONS = {
  popularity: {
    label: "Popularity Report",
    endpoint: "/api/reports/popularity",
    usesItemType: true,
    usesSort: true,
    sortOptions: [
      { label: "Most Popular", value: "times_checked_out" },
      { label: "Title", value: "title" },
      { label: "Borrowing Rate", value: "borrowing_rate" },
    ],
  },
  fees: {
    label: "Unpaid Fees Report",
    endpoint: "/api/reports/fees",
    usesItemType: false,
    usesSort: false,
    sortOptions: [],
  },
  thirdReport: {
    label: "Third Report",
    endpoint: "/api/reports/third",
    usesItemType: false,
    usesSort: false,
    sortOptions: [],
  },
};

export default function ReportsPage() {
  const userType = sessionStorage.getItem("userType");
  const token = sessionStorage.getItem("token");

  const [reportType, setReportType] = useState("popularity");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [type, setType] = useState("All");
  const [sort, setSort] = useState("times_checked_out");

  const currentReport = REPORT_OPTIONS[reportType];
  const { endpoint, usesItemType, usesSort } = currentReport;

  useEffect(() => {
    if (!token) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    async function fetchReport() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (usesItemType && type !== "All") {
          params.append("type", type === "Books" ? "1" : "2");
        }

        if (usesSort && sort) {
          params.append("sort", sort);
        }

        const query = params.toString();
        const url = `http://localhost:3000${endpoint}${query ? `?${query}` : ""}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load report");
        }

        setData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Failed to fetch report:", err);
        setError(err.message || "Failed to load report");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [token, endpoint, usesItemType, usesSort, type, sort]);

  if (userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">Reports</h1>
        <p className="text-gray-600 mb-6">{currentReport.label}</p>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Report</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border px-3 py-2 rounded"
            >
              <option value="popularity">Popularity</option>
              <option value="fees">Unpaid Fees</option>
              <option value="thirdReport">Third Report</option>
            </select>
          </div>

          {currentReport.usesItemType && (
            <div>
              <label className="text-sm text-gray-600 block mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border px-3 py-2 rounded"
              >
                <option>All</option>
                <option>Books</option>
                <option>CDs</option>
              </select>
            </div>
          )}

          {currentReport.usesSort && (
            <div>
              <label className="text-sm text-gray-600 block mb-1">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border px-3 py-2 rounded"
              >
                {currentReport.sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-white p-6 rounded shadow">Loading...</div>
        )}

        {error && (
          <div className="bg-white p-6 rounded shadow text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="bg-white p-6 rounded shadow">
            No data found.
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((item, index) => {
              if (reportType === "fees") {
                return <FeeReportCard key={item.Person_ID || index} item={item} />;
              }

              if (reportType === "thirdReport") {
                return <ThirdReportCard key={index} item={item} />;
              }

              return <PopularityReportCard key={item.Item_ID || index} item={item} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PopularityReportCard({ item }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-green-900">
        {item.Item_name}
      </h3>

      <p className="text-sm text-gray-600 mt-2">
        <strong>ID:</strong> {item.Item_ID}
      </p>

      <p className="text-sm text-gray-600">
        <strong>Checked Out:</strong> {item.times_checked_out}
      </p>

      <p className="text-sm text-gray-600">
        <strong>Genre:</strong> {item.genre || "N/A"}
      </p>

      {"borrowing_rate" in item && (
        <p className="text-sm text-gray-600">
          <strong>Borrowing Rate:</strong> {item.borrowing_rate}
        </p>
      )}
    </div>
  );
}

function FeeReportCard({ item }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-green-900">
        {item.First_name} {item.Last_name}
      </h3>

      <p className="text-sm text-gray-600 mt-2">
        <strong>Person ID:</strong> {item.Person_ID}
      </p>

      <p className="text-sm text-gray-600">
        <strong>Role:</strong> {item.role}
      </p>

      <p className="text-sm text-gray-600">
        <strong>Unpaid Fees:</strong> {item.unpaid_fee_count}
      </p>

      <p className="text-sm text-gray-600">
        <strong>Unpaid Total:</strong> ${item.unpaid_total}
      </p>
    </div>
  );
}

function ThirdReportCard({ item }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-green-900">Third Report</h3>

      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
        {JSON.stringify(item, null, 2)}
      </pre>
    </div>
  );
}