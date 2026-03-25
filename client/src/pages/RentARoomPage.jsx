import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";

export default function RentARoomPage() {
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [length, setLength] = useState(1);
  const [nextAvailable, setNextAvailable] = useState(null);

  const token = sessionStorage.getItem("token");
  const personId = sessionStorage.getItem("personId");
  const isStaff = sessionStorage.getItem("userType") === "staff";

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

  const handleReserve = async (e) => {
    e.preventDefault();
    setMessage("");
    setNextAvailable(null);
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
          length: parseInt(length),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to make reservation.");
        if (data.next_available) setNextAvailable(data.next_available);
        return;
      }
      setMessage(`Reservation made! Room ${data.room_id} from ${data.start_time} to ${data.end_time}.`);
      setStartTime("");
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
    return new Date(str).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isStaff ? "/staff" : "/customer")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-green-900 mb-2">Rent a Room</h1>
        <p className="text-gray-600 mb-8">Reserve a study room. You can only have one active reservation at a time.</p>

        {loading && <p className="text-gray-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {message && (
          <p className={`mb-6 text-sm font-medium ${message.includes("success") || message.includes("made") ? "text-green-700" : "text-red-600"}`}>
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
              <p><span className="font-semibold">Length:</span> {reservation.length}</p>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Length (hours)</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                    <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-green-900 text-white py-3 rounded-xl font-semibold hover:bg-green-800"
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
