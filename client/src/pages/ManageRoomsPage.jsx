import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import Banner from "../components/Banner";
import { apiFetch } from "../api";
import { getSessionRoleState } from "../auth";

export default function ManageRoomsPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");
  const { isStaff, isAdmin } = getSessionRoleState();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", success: true });
  const [addingRoom, setAddingRoom] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    if (!isStaff && !isAdmin) { navigate("/login"); return; }
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (r.ok) setRooms(data);
      else setMessage({ text: data.error || "Failed to load rooms.", success: false });
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    setAddingRoom(true);
    setMessage({ text: "", success: true });
    try {
      const r = await apiFetch("/api/rooms", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (r.ok) {
        setMessage({ text: `Room ${data.room_id} added successfully.`, success: true });
        await fetchRooms();
      } else {
        setMessage({ text: data.error || "Failed to add room.", success: false });
      }
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setAddingRoom(false);
    }
  };

  const handleToggleStatus = async (room) => {
    setTogglingId(room.Room_ID);
    setMessage({ text: "", success: true });
    const newStatus = room.Room_status === 1 ? 0 : 1;
    try {
      const r = await apiFetch(`/api/rooms/${room.Room_ID}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ Room_status: newStatus }),
      });
      const data = await r.json();
      if (r.ok) {
        setRooms((prev) =>
          prev.map((rm) => rm.Room_ID === room.Room_ID ? { ...rm, Room_status: newStatus } : rm)
        );
      } else {
        setMessage({ text: data.error || "Failed to update room.", success: false });
      }
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setTogglingId(null);
    }
  };

  const available = rooms.filter((r) => r.Room_status === 1);
  const unavailable = rooms.filter((r) => r.Room_status !== 1);

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : "/staff")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-green-900">Manage Rooms</h1>
          <button
            onClick={handleAddRoom}
            disabled={addingRoom}
            className="bg-green-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {addingRoom ? "Adding..." : "+ Add Room"}
          </button>
        </div>
        <p className="text-gray-600 mb-6">Add rooms and control which ones are available for reservation.</p>

        <Banner message={message} onDismiss={() => setMessage({ text: "", success: true })} />

        {loading ? (
          <p className="text-gray-400 italic text-sm mt-4">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-400 italic text-sm mt-4">No rooms found. Add one to get started.</p>
        ) : (
          <div className="space-y-6 mt-4">
            {available.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-green-900 mb-3">Available for Reservation</h2>
                <div className="space-y-2">
                  {available.map((room) => (
                    <RoomRow key={room.Room_ID} room={room} onToggle={handleToggleStatus} toggling={togglingId === room.Room_ID} />
                  ))}
                </div>
              </section>
            )}
            {unavailable.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-500 mb-3">Unavailable</h2>
                <div className="space-y-2">
                  {unavailable.map((room) => (
                    <RoomRow key={room.Room_ID} room={room} onToggle={handleToggleStatus} toggling={togglingId === room.Room_ID} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomRow({ room, onToggle, toggling }) {
  const isAvailable = room.Room_status === 1;
  return (
    <div className="bg-white rounded-xl shadow-sm border px-5 py-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-800">Room {room.Room_ID}</p>
        <span
          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {isAvailable ? "Available" : "Unavailable"}
        </span>
      </div>
      <button
        onClick={() => onToggle(room)}
        disabled={toggling}
        className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition ${
          isAvailable
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-green-900 text-white hover:bg-green-800"
        }`}
      >
        {toggling ? "Saving..." : isAvailable ? "Mark Unavailable" : "Mark Available"}
      </button>
    </div>
  );
}
