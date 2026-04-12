import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import ItemImage from "../components/ItemImage";
import { apiFetch } from "../api";
import Banner from "../components/Banner";

const DEVICE_TYPE_LABELS = { 1: "Computer", 2: "Tablet", 3: "Laptop" };

export default function DeviceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState({ text: "", success: true });

  const token = sessionStorage.getItem("token");
  const personId = parseInt(sessionStorage.getItem("personId"));

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/api/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Failed to load device."); return; }
      setItem(data);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const availableCount = item?.copies?.filter((c) => c.Copy_status === 1).length ?? 0;
  const totalCount = item?.copies?.filter((c) => c.Copy_status !== 0).length ?? 0;

  const handleBorrow = async () => {
    setMessage({ text: "", success: true });
    try {
      const response = await apiFetch("/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ person_id: personId, item_id: parseInt(id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ text: data.error || "Failed to borrow device.", success: false });
        return;
      }
      setMessage({ text: `Device checked out successfully. Return by ${new Date(data.return_by).toLocaleDateString()}.`, success: true });
      fetchData();
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  };

  const handleHold = async () => {
    setMessage({ text: "", success: true });
    try {
      const response = await apiFetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ person_id: personId, item_id: parseInt(id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ text: data.error || "Failed to place hold.", success: false });
        return;
      }
      setMessage({ text: `Hold placed! Queue position: ${data.queue_position}`, success: true });
      fetchData();
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-100"><NavigationBar /><p className="p-8 text-gray-600">Loading...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-100"><NavigationBar /><p className="p-8 text-red-600">{error}</p></div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/rent-a-device")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <ItemImage
              itemId={item.Item_ID}
              itemName={item.Item_name}
              className="mx-auto h-32 w-24 sm:mx-0"
            />
            <div className="flex-1">
              <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
                {DEVICE_TYPE_LABELS[item.Device_type] || "Device"}
              </p>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{item.Item_name}</h1>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{availableCount}</span> of{" "}
                  <span className="font-semibold">{totalCount}</span> copies available
                </p>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleBorrow}
                  disabled={availableCount === 0}
                  className="bg-green-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Borrow
                </button>
                <button
                  onClick={handleHold}
                  className="border border-green-900 text-green-900 px-6 py-3 rounded-xl font-semibold hover:bg-green-50"
                >
                  Place Hold
                </button>
              </div>

              <Banner message={message} onDismiss={() => setMessage({ text: "", success: true })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
