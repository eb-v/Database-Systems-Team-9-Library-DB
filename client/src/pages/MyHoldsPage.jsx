import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import ItemImage from "../components/ItemImage";
import { apiFetch } from "../api";
import Banner from "../components/Banner";

export default function MyHoldsPage() {
  const navigate = useNavigate();
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState({ text: "", success: true });

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const fetchHolds = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/api/holds/${personId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to load holds.");
        return;
      }
      // only show active holds (1 = waiting, 2 = ready to checkout)
      setHolds(data.filter((h) => h.hold_status === 1 || h.hold_status === 2));
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolds();
  }, []);

  const handleCancel = async (holdId) => {
    setMessage({ text: "", success: true });
    try {
      const response = await apiFetch(`/api/holds/${holdId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ text: data.error || "Failed to cancel hold.", success: false });
        return;
      }
      setMessage({ text: "Hold cancelled successfully.", success: true });
      fetchHolds();
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  };

  const getStatusLabel = (status) => {
    if (status === 1) return { label: "Waiting", color: "text-yellow-600 bg-yellow-50" };
    if (status === 2) return { label: "Ready to Checkout", color: "text-green-700 bg-green-50" };
    return { label: "Unknown", color: "text-gray-500 bg-gray-50" };
  };

  const getItemTypeLabel = (type) => {
    if (type === 1) return "Book";
    if (type === 2) return "CD";
    if (type === 3) return "Device";
    return "Item";
  };

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

        <h1 className="text-3xl font-bold text-green-900 mb-2">My Holds</h1>
        <p className="text-gray-600 mb-8">Items you currently have on hold.</p>

        {loading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        <Banner message={message} onDismiss={() => setMessage({ text: "", success: true })} />

        {!loading && !error && holds.length === 0 && (
          <p className="text-gray-600">You have no active holds.</p>
        )}

        <div className="space-y-4">
          {holds.map((hold) => {
            const status = getStatusLabel(hold.hold_status);
            return (
              <div key={hold.Hold_ID} className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <ItemImage itemId={hold.Item_ID} itemName={hold.Item_name} />
                    <div className="min-w-0">
                      <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
                        {getItemTypeLabel(hold.Item_type)}
                      </p>
                      <h3 className="text-lg font-bold text-gray-800">{hold.Item_name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Queue position: {hold.queue_status + 1}
                      </p>
                      {hold.hold_status === 2 && hold.expiry_date && (
                        <p className="text-sm text-green-700 mt-1">
                          Expires: {new Date(hold.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 flex gap-3">
                  {hold.hold_status === 2 && (
                    <button
                      onClick={() => navigate(hold.Item_type === 3 ? `/rent-a-device/${hold.Item_ID}` : `/catalog/${hold.Item_ID}`)}
                      className="bg-green-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-800"
                    >
                      Checkout Now
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(hold.Hold_ID)}
                    className="border border-red-400 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50"
                  >
                    Cancel Hold
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
