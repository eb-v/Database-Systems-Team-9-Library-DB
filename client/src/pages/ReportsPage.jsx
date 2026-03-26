import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import NavigationBar from "../components/NavigationBar";

export default function ReportsPage() {
  const userType = sessionStorage.getItem("userType");
  const token = sessionStorage.getItem("token");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [type, setType] = useState("All");
  const [sort, setSort] = useState("times_checked_out");

  useEffect(() => {
    if (!token) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        let url = "http://localhost:3000/api/reports/popularity";

        const params = new URLSearchParams();

        if (type !== "All") {
          params.append("type", type === "Books" ? "1" : "2");
        }

        if (sort) {
          params.append("sort", sort);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load report");
        }

        setData(json);
        setError("");
      } catch (err) {
        console.error(err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, sort, token]);

  if (userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">Reports</h1>
        <p className="text-gray-600 mb-6">Popularity Report</p>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex gap-4 flex-wrap">
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

          <div>
            <label className="text-sm text-gray-600 block mb-1">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border px-3 py-2 rounded"
            >
              <option value="times_checked_out">Most Popular</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        {/* Content */}
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
            {data.map((item) => (
              <ReportCard key={item.Item_ID} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ item }) {
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
    </div>
  );
}