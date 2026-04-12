import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import ItemImage from "../components/ItemImage";
import { apiFetch } from "../api";

const DEVICE_TYPE_LABELS = { 1: "Computer", 2: "Tablet", 3: "Laptop" };

export default function RentADevicePage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const token = sessionStorage.getItem("token");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiFetch("/api/items?type=3", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Failed to load devices.");
          return;
        }
        setDevices(data.filter((d) => Number(d.total_copies) > 0));
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  const typeFilterValue = typeFilter === "Computer" ? 1 : typeFilter === "Tablet" ? 2 : typeFilter === "Laptop" ? 3 : null;

  const filtered = devices.filter((d) => {
    const matchesQuery = d.Item_name.toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilterValue === null || d.Device_type === typeFilterValue;
    return matchesQuery && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      {/* green search banner */}
      <div className="bg-green-900 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Rent a Device</h1>
          <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col md:flex-row gap-3 items-center">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option>All</option>
              <option>Computer</option>
              <option>Tablet</option>
              <option>Laptop</option>
            </select>

            <input
              type="text"
              placeholder="Search devices..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
              className="flex-1 border border-gray-300 rounded px-4 py-2"
            />
          </div>
        </div>
      </div>

      <div className="py-2 px-2">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/customer")}
            className="text-sm text-green-900 font-semibold hover:underline inline-block text-center"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* results */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-600">No devices found.</p>
        )}

        <div className="space-y-4">
          {filtered.map((device) => (
            <div
              key={device.Item_ID}
              onClick={() => navigate(`/rent-a-device/${device.Item_ID}`)}
              className="bg-white rounded-xl shadow-md p-5 cursor-pointer hover:shadow-lg transition flex items-center gap-4"
            >
              <ItemImage itemId={device.Item_ID} itemName={device.Item_name} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
                  {DEVICE_TYPE_LABELS[device.Device_type] || "Device"}
                </p>
                <h3 className="text-lg font-bold text-gray-800">{device.Item_name}</h3>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-green-800">
                  {Number(device.available_copies)} available
                </p>
                <p className="text-xs text-gray-400">{Number(device.total_copies)} total copies</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
