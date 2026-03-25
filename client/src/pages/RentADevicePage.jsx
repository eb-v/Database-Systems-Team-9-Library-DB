import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function RentADevicePage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [devicesRes, borrowsRes] = await Promise.all([
        apiFetch("/api/items?type=3", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch(`/api/borrow/${personId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const devicesData = await devicesRes.json();
      const borrowsData = await borrowsRes.json();

      if (!devicesRes.ok) {
        setError(devicesData.error || "Failed to load devices.");
        return;
      }
      if (!borrowsRes.ok) {
        setError(borrowsData.error || "Failed to load borrows.");
        return;
      }

      setDevices(devicesData);
      // only active device borrows
      setBorrows(borrowsData.filter((b) => b.Copy_status === 2 && b.Item_type === 3));
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBorrow = async (itemId) => {
    setMessage("");
    try {
      const response = await apiFetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ person_id: parseInt(personId), item_id: itemId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to borrow device.");
        return;
      }
      setMessage(`Device checked out successfully. Return by ${new Date(data.return_by).toLocaleDateString()}.`);
      fetchData();
    } catch (err) {
      setMessage("Unable to connect to the server.");
    }
  };

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
        setMessage(data.error || "Failed to return device.");
        return;
      }
      let msg = "Device returned successfully.";
      if (data.fees_charged?.late > 0) msg += ` Late fee: $${data.fees_charged.late}.`;
      if (data.fees_charged?.damage > 0) msg += ` Damage fee: $${data.fees_charged.damage}.`;
      if (data.fees_charged?.loss > 0) msg += ` Loss fee: $${data.fees_charged.loss}.`;
      setMessage(msg);
      fetchData();
    } catch (err) {
      setMessage("Unable to connect to the server.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/customer")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-green-900 mb-2">Rent a Device</h1>
        <p className="text-gray-600 mb-8">Borrow laptops, tablets, and other devices.</p>

        {loading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {message && (
          <p className={`mb-6 text-sm font-medium ${message.includes("success") || message.includes("Successfully") ? "text-green-700" : "text-red-600"}`}>
            {message}
          </p>
        )}

        {/* currently borrowed devices */}
        {!loading && borrows.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Your Borrowed Devices</h2>
            <div className="space-y-4">
              {borrows.map((borrow) => (
                <BorrowCard key={borrow.BorrowedItem_ID} borrow={borrow} onReturn={handleReturn} />
              ))}
            </div>
          </div>
        )}

        {/* available devices */}
        {!loading && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Available Devices</h2>
            {devices.length === 0 && <p className="text-gray-600">No devices found.</p>}
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.Item_ID} className="bg-white rounded-xl shadow-md p-5 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
                      {device.Device_type || "Device"}
                    </p>
                    <h3 className="text-lg font-bold text-gray-800">{device.Item_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {device.available_copies} of {device.total_copies} available
                    </p>
                  </div>
                  <button
                    onClick={() => handleBorrow(device.Item_ID)}
                    disabled={device.available_copies === 0}
                    className="bg-green-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Borrow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BorrowCard({ borrow, onReturn }) {
  const [damaged, setDamaged] = useState(false);
  const [lost, setLost] = useState(false);
  const overdue = new Date() > new Date(borrow.returnBy_date);

  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <p className="text-xs text-green-800 font-semibold uppercase tracking-wide mb-1">
        {borrow.Device_type || "Device"}
      </p>
      <h3 className="text-lg font-bold text-gray-800">{borrow.Item_name}</h3>
      <p className="text-sm text-gray-500 mt-1">
        Borrowed: {new Date(borrow.borrow_date).toLocaleDateString()}
      </p>
      <p className={`text-sm mt-1 ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
        Return by: {new Date(borrow.returnBy_date).toLocaleDateString()}
        {overdue && " — Overdue"}
      </p>

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
          Return Device
        </button>
      </div>
    </div>
  );
}
