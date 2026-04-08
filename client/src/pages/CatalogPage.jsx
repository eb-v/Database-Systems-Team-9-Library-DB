import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";
import { getSessionRoleState } from "../auth";

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { isStaff, isAdmin } = getSessionRoleState();

  const [category, setCategory] = useState(
    searchParams.get("type") === "1" ? "Books" :
    searchParams.get("type") === "2" ? "CDs" : "All"
  );
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = sessionStorage.getItem("token");

  const fetchItems = async (searchQuery, categoryValue) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (categoryValue === "Books") params.set("type", "1");
      else if (categoryValue === "CDs") params.set("type", "2");

      const response = await apiFetch(`/api/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to load items.");
        return;
      }

      // filter out devices (type 3) and items with no active copies
      setResults(data.filter((item) => item.Item_type !== 3 && Number(item.total_copies) > 0));
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(query, category);
  }, []);

  const handleSearch = () => {
    fetchItems(query, category);
  };

  const getItemTypeLabel = (type) => {
    if (type === 1) return "Book";
    if (type === 2) return "CD";
    return "Item";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      {/* search bar */}
      <div className="bg-green-900 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Browse Catalog</h1>
          <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col md:flex-row gap-3 items-center">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option>All</option>
              <option>Books</option>
              <option>CDs</option>
            </select>

            <input
              type="text"
              placeholder="Search the library..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border border-gray-300 rounded px-4 py-2"
            />

            <button
              onClick={handleSearch}
              className="bg-green-800 text-white px-5 py-2 rounded font-semibold hover:bg-green-900"
            >
              Search
            </button>

          </div>
        </div>
      </div>

      <div className="py-2 px-2">
        <div className="max-w-4xl mx-auto">
          <button
              onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
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
        {!loading && !error && results.length === 0 && (
          <p className="text-gray-600">No items found.</p>
        )}

        <div className="space-y-4">
          {results.map((item) => (
            <div
              key={item.Item_ID}
              onClick={() => navigate(`/catalog/${item.Item_ID}`)}
              className="bg-white rounded-xl shadow-md p-5 cursor-pointer hover:shadow-lg transition flex justify-between items-center"
            >
              <div>
                <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
                  {getItemTypeLabel(item.Item_type)}
                </p>
                <h3 className="text-lg font-bold text-gray-800">{item.Item_name}</h3>
                {item.Item_type === 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {item.author_firstName} {item.author_lastName}
                  </p>
                )}
                {item.Item_type === 2 && (
                  <p className="text-sm text-gray-500 mt-1">Rating: {item.rating}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-800">
                  {item.available_copies} available
                </p>
                <p className="text-xs text-gray-400">{item.total_copies} total copies</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
