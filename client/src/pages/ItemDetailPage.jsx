import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import ItemImage from "../components/ItemImage";
import { apiFetch } from "../api";

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = sessionStorage.getItem("token");
  const personId = parseInt(sessionStorage.getItem("personId"));

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await apiFetch(`/api/items/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Failed to load item.");
          return;
        }
        setItem(data);
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const availableCopy = item?.copies?.find((c) => c.Copy_status === 1);
  const availableCount = item?.copies?.filter((c) => c.Copy_status === 1).length ?? 0;

  const handleBorrow = async () => {
    setMessage("");
    try {
      const response = await apiFetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ person_id: personId, item_id: item.Item_ID }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to borrow item.");
        return;
      }
      setMessage(`Item borrowed successfully! Return by: ${data.return_by}`);
    } catch {
      setMessage("Unable to connect to the server.");
    }
  };

  const handleHold = async () => {
    setMessage("");
    try {
      const response = await apiFetch("/api/holds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ person_id: personId, item_id: item.Item_ID }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to place hold.");
        return;
      }
      setMessage(`Hold placed successfully! Queue position: ${data.queue_position}`);
    } catch {
      setMessage("Unable to connect to the server.");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-100"><NavigationBar /><p className="p-8 text-gray-600">Loading...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-100"><NavigationBar /><p className="p-8 text-red-600">{error}</p></div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(-1)}
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
            {item.Item_type === 1 ? "Book" : item.Item_type === 2 ? "CD" : "Item"}
          </p>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{item.Item_name}</h1>

          {/* book details */}
          {item.Item_type === 1 && (
            <div className="text-sm text-gray-600 space-y-1 mt-4">
              <p><span className="font-semibold">Author:</span> {item.author_firstName} {item.author_lastName}</p>
              <p><span className="font-semibold">Publisher:</span> {item.publisher}</p>
              <p><span className="font-semibold">Year Published:</span> {item.year_published ? new Date(item.year_published).getFullYear() : "—"}</p>
            </div>
          )}

          {/* cd details */}
          {item.Item_type === 2 && (
            <div className="text-sm text-gray-600 space-y-1 mt-4">
              <p><span className="font-semibold">Rating:</span> {item.rating}</p>
              <p><span className="font-semibold">Release Date:</span> {item.release_date ? new Date(item.release_date).toLocaleDateString() : "—"}</p>
            </div>
          )}

          {/* availability */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{availableCount}</span> of{" "}
              <span className="font-semibold">{item.copies.filter((c) => c.Copy_status !== 0).length}</span> copies available
            </p>
          </div>

          {/* actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleBorrow}
              disabled={!availableCopy}
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

          {message && (
            <p className={`mt-4 text-sm font-medium ${message.includes("success") ? "text-green-700" : "text-red-600"}`}>
              {message}
            </p>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
