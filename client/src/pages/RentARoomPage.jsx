import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

const OPEN_HOUR = 8;
const CLOSE_HOUR = 21;

// generate time slot labels for the dropdown (8:00 AM … 8:00 PM)
const TIME_SLOTS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => {
  const hour = OPEN_HOUR + i;
  const label = hour < 12
    ? `${hour}:00 AM`
    : hour === 12
    ? `12:00 PM`
    : `${hour - 12}:00 PM`;
  return { hour, label };
});

export default function RentARoomPage() {
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState(OPEN_HOUR);
  const [length, setLength] = useState(1);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [availableSlots, setAvailableSlots] = useState(null); // null = not fetched yet
  const [slotsLoading, setSlotsLoading] = useState(false);

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  // patrons capped at 4 hours; staff/admin can book up to closing time
  const roleMax = isStaff || isAdmin ? CLOSE_HOUR - OPEN_HOUR : 4;
  const maxLength = Math.min(roleMax, CLOSE_HOUR - selectedHour);

  const fetchReservations = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/api/reservations/${personId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to load reservations.");
        return;
      }
      // only show the active reservation (status 1)
      const active = data.find((r) => r.reservation_status === 1);
      setReservation(active || null);
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setAvailableSlots(null);
    apiFetch(`/api/reservations/available?date=${selectedDate}&length=${length}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAvailableSlots(data.available_slots ?? []);
        // if current selection is no longer available, pick the first available slot
        if (data.available_slots && !data.available_slots.includes(selectedHour)) {
          setSelectedHour(data.available_slots[0] ?? OPEN_HOUR);
        }
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, length]);

  const handleReserve = async (e) => {
    e.preventDefault();
    setMessage("");
    setNextAvailable(null);

    // build ISO start_time from the chosen date + hour slot
    const startTime = `${selectedDate}T${String(selectedHour).padStart(2, "0")}:00:00`;
    const clampedLength = Math.min(parseInt(length), maxLength);

    try {
      const response = await apiFetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          person_id: parseInt(personId),
          start_time: startTime,
          length: clampedLength,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to make reservation.");
        if (data.next_available) setNextAvailable(data.next_available);
        return;
      }
      const start = new Date(data.start_time);
      const end = new Date(data.end_time);
      const datePart = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      const timePart = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
      setMessage(`Reservation confirmed! Room ${data.room_id} · ${datePart} · ${timePart}`);
      setSelectedDate("");
      setSelectedHour(OPEN_HOUR);
      setLength(1);
      fetchReservations();
    } catch (err) {
      setMessage("Unable to connect to the server.");
    }
  };

  const handleCancel = async () => {
    setMessage("");
    try {
      const response = await apiFetch(`/api/reservations/${reservation.Reservation_ID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to cancel reservation.");
        return;
      }
      setMessage("Reservation cancelled successfully.");
      fetchReservations();
    } catch (err) {
      setMessage("Unable to connect to the server.");
    }
  };

  const formatDatetime = (str) => {
    if (!str) return "—";
    const d = new Date(str);
    const date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time}`;
  };

  // MySQL returns length as "HH:MM:SS" — convert to "X hour(s)"
  const formatLength = (val) => {
    if (!val) return "—";
    const hours = typeof val === "string" ? parseInt(val.split(":")[0], 10) : val;
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
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

        <h1 className="text-3xl font-bold text-green-900 mb-2">Rent a Room</h1>
        <p className="text-gray-600 mb-8">Reserve a study room. You can only have one active reservation at a time.</p>

        {loading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {message && (
          <p className={`mb-6 text-sm font-medium ${message.includes("confirmed") || message.includes("cancelled") ? "text-green-700" : "text-red-600"}`}>
            {message}
            {nextAvailable && (
              <span className="block mt-1">Next available slot: {formatDatetime(nextAvailable)}</span>
            )}
          </p>
        )}

        {/* active reservation */}
        {!loading && reservation && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Your Active Reservation</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-semibold">Room:</span> {reservation.Room_ID}</p>
              <p><span className="font-semibold">Start:</span> {formatDatetime(reservation.start_time)}</p>
              <p><span className="font-semibold">Length:</span> {formatLength(reservation.length)}</p>
            </div>
            <button
              onClick={handleCancel}
              className="mt-4 border border-red-400 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50"
            >
              Cancel Reservation
            </button>
          </div>
        )}

        {/* make reservation form */}
        {!loading && !reservation && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Make a Reservation</h2>
            <form onSubmit={handleReserve} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Time <span className="text-gray-400 font-normal">(Library hours: 8:00 AM – 9:00 PM)</span>
                </label>
                {!selectedDate ? (
                  <p className="text-sm text-gray-400 italic">Select a date first</p>
                ) : slotsLoading ? (
                  <p className="text-sm text-gray-400 italic">Checking availability...</p>
                ) : availableSlots && availableSlots.length === 0 ? (
                  <p className="text-sm text-red-500">No available slots for this date and duration.</p>
                ) : (
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      const h = parseInt(e.target.value);
                      setSelectedHour(h);
                      if (length > CLOSE_HOUR - h) setLength(CLOSE_HOUR - h);
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3"
                    disabled={!availableSlots}
                  >
                    {TIME_SLOTS
                      .filter(({ hour }) => !availableSlots || availableSlots.includes(hour))
                      .map(({ hour, label }) => (
                        <option key={hour} value={hour}>{label}</option>
                      ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (hours)</label>
                <select
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3"
                >
                  {Array.from({ length: maxLength }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!availableSlots || availableSlots.length === 0 || slotsLoading}
                className="w-full bg-green-900 text-white py-3 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reserve Room
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
