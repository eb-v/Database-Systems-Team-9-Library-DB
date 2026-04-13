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
  const [addCooldown, setAddCooldown] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmRoom, setConfirmRoom] = useState(null); // room pending unavailable confirmation

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
    setAddCooldown(true);
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
      setTimeout(() => setAddCooldown(false), 2000);
    }
  };

  const handleToggleStatus = async (room) => {
    // marking unavailable is destructive — require confirmation first
    if (room.Room_status === 1) {
      setConfirmRoom(room);
      return;
    }
    await applyToggle(room, 1);
  };

  const applyToggle = async (room, newStatus) => {
    setConfirmRoom(null);
    setTogglingId(room.Room_ID);
    setMessage({ text: "", success: true });
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
        setMessage({ text: data.message, success: true });
      } else {
        setMessage({ text: data.error || "Failed to update room.", success: false });
      }
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setTogglingId(null);
    }
  };

  const [availableOpen, setAvailableOpen] = useState(true);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  const available = rooms.filter((r) => r.Room_status === 1);
  const unavailable = rooms.filter((r) => r.Room_status !== 1);

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : "/staff")}
          className=" text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <div className=" flex items-center justify-between mb-2">
          <h1 className=" text-3xl font-bold text-green-900">Manage Rooms</h1>
          <button
            onClick={handleAddRoom}
            disabled={addingRoom || addCooldown}
            className="bg-green-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {addingRoom ? "Adding..." : "+ Add Room"}
          </button>
        </div>
        <p className="text-gray-600 mb-6">Add rooms and control which ones are available for reservation.</p>

        <Banner message={message} onDismiss={() => setMessage({ text: "", success: true })} />

        {confirmRoom && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 mb-4">
            <p className="text-sm font-semibold text-red-700">
              Mark Room {confirmRoom.Room_ID} as unavailable?
            </p>
            <p className="mt-1 text-sm text-red-600">
              Any active reservations for this room will be automatically cancelled.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmRoom(null)}
                className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                No, Keep Available
              </button>
              <button
                type="button"
                onClick={() => applyToggle(confirmRoom, 0)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, Mark Unavailable
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 italic text-sm mt-4">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-400 italic text-sm mt-4">No rooms found. Add one to get started.</p>
        ) : (
          <div className=" bg-white rounded-xl justify-between shadow-sm space-y-3 mt-4">
            <Accordion
              label="Available for Reservation"
              count={available.length}
              open={availableOpen}
              onToggle={() => setAvailableOpen((o) => !o)}
              color="green"
            >
              {available.length === 0
                ? <p className="text-sm text-gray-400 italic">No available rooms.</p>
                : <div className="space-y-2">{available.map((room) => (
                    <RoomRow key={room.Room_ID} room={room} onToggle={handleToggleStatus} toggling={togglingId === room.Room_ID} />
                  ))}</div>
              }
            </Accordion>

            <Accordion
              label="Unavailable"
              count={unavailable.length}
              open={unavailableOpen}
              onToggle={() => setUnavailableOpen((o) => !o)}
              color="red"
            >
              {unavailable.length === 0
                ? <p className="text-sm text-gray-400 italic">No unavailable rooms.</p>
                : <div className="space-y-3">{unavailable.map((room) => (
                    <RoomRow key={room.Room_ID} room={room} onToggle={handleToggleStatus} toggling={togglingId === room.Room_ID} />
                  ))}</div>
              }
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}

function Accordion({ label, count, open, onToggle, color, children }) {
  const headerColor = color === "green" ? "hover:bg-green-50" : "hover:bg-gray-50";
  const badgeColor = color === "green" ? "bg-green-100 text-green-800" : color === "red" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600";
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-800 ${headerColor} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <span>{label}</span>
          {count > 0 && (
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor}`}>{count}</span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function RoomRow({ room, onToggle, toggling }) {
  const isAvailable = room.Room_status === 1;
  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
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
            ? "bg-red-600 text-white hover:bg-red-600"
            : "bg-green-800 text-white hover:bg-green-800"
        }`}
      >
        {toggling ? "Saving..." : isAvailable ? "Mark Unavailable" : "Mark Available"}
      </button>
    </div>
  );
}
