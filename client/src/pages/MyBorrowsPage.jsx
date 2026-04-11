import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import ItemImage from "../components/ItemImage";
import { apiFetch } from "../api";

export default function MyBorrowsPage() {
  const navigate = useNavigate();
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const fetchBorrows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/api/borrow/${personId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to load borrows.");
        return;
      }
      // only show active borrows (Copy_status 2 = checked out)
      setBorrows(data.filter((b) => b.Copy_status === 2));
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrows();
  }, []);

  const handleReturn = async (borrowedItemId, damaged, lost) => {
    setMessage("");
    try {
      const response = await apiFetch("/api/borrow/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ borrowedItem_id: borrowedItemId, damaged, lost }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to return item.");
        return;
      }
      let msg = "Item returned successfully.";
      if (data.fees_charged.late > 0) msg += ` Late fee: $${data.fees_charged.late}.`;
      if (data.fees_charged.damage > 0) msg += ` Damage fee: $${data.fees_charged.damage}.`;
      if (data.fees_charged.loss > 0) msg += ` Loss fee: $${data.fees_charged.loss}.`;
      setMessage(msg);
      fetchBorrows();
    } catch {
      setMessage("Unable to connect to the server.");
    }
  };

  const getItemTypeLabel = (type) => {
    if (type === 1) return "Book";
    if (type === 2) return "CD";
    if (type === 3) return "Device";
    return "Item";
  };

  const isOverdue = (returnByDate) => new Date() > new Date(returnByDate);

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

        <h1 className="text-3xl font-bold text-green-900 mb-2">Active Borrows</h1>
        <p className="text-gray-600 mb-8">Items you currently have checked out.</p>

        {loading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {message && (
          <p className={`mb-4 text-sm font-medium ${message.includes("success") ? "text-green-700" : "text-red-600"}`}>
            {message}
          </p>
        )}

        {!loading && !error && borrows.length === 0 && (
          <p className="text-gray-600">You have no active borrows.</p>
        )}

        <div className="space-y-4">
          {borrows.map((borrow) => (
            <BorrowCard
              key={borrow.BorrowedItem_ID}
              borrow={borrow}
              onReturn={handleReturn}
              getItemTypeLabel={getItemTypeLabel}
              isOverdue={isOverdue}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BorrowCard({ borrow, onReturn, getItemTypeLabel, isOverdue }) {
  const [damaged, setDamaged] = useState(false);
  const [lost, setLost] = useState(false);
  const overdue = isOverdue(borrow.returnBy_date);

  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <div className="flex items-start gap-4">
        <ItemImage itemId={borrow.Item_ID} itemName={borrow.Item_name} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
            {getItemTypeLabel(borrow.Item_type)}
          </p>
          <h3 className="text-lg font-bold text-gray-800">{borrow.Item_name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Borrowed: {new Date(borrow.borrow_date).toLocaleDateString()}
          </p>
          <p className={`text-sm mt-1 ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
            Return by: {new Date(borrow.returnBy_date).toLocaleDateString()}
            {overdue && " — Overdue"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex gap-4 text-sm text-gray-600">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={damaged}
              onChange={(e) => {
                setDamaged(e.target.checked);
                if (e.target.checked) setLost(false);
              }}
            />
            Damaged
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lost}
              onChange={(e) => {
                setLost(e.target.checked);
                if (e.target.checked) setDamaged(false);
              }}
            />
            Lost
          </label>
        </div>

        <button
          onClick={() => onReturn(borrow.BorrowedItem_ID, damaged, lost)}
          className="mt-1 bg-green-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-800 w-fit"
        >
          Return Item
        </button>
      </div>
    </div>
  );
}
