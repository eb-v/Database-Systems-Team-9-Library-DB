import { useState } from "react";
import NavigationBar from "../components/NavigationBar";

export default function HoldsPage() {
  const [holdId, setHoldId] = useState("");
  const [queueStatus, setQueueStatus] = useState("");
  const [personId, setPersonId] = useState("");
  const [copyId, setCopyId] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!holdId || !queueStatus || !personId || !copyId) {
      setMessage("Please fill in all required fields.");
      return;
    }

    setMessage("Hold request recorded.");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          Place Hold
        </h1>
        <p className="text-gray-600 mb-8">
          Record a hold request for a library guest.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900 mb-2">
              Hold Information
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hold ID <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={holdId}
                onChange={(e) => setHoldId(e.target.value)}
                placeholder="Enter hold ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Queue Status <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={queueStatus}
                onChange={(e) => setQueueStatus(e.target.value)}
                placeholder="Enter number of users ahead"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Person ID <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                placeholder="Enter person ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Copy ID <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={copyId}
                onChange={(e) => setCopyId(e.target.value)}
                placeholder="Enter copy ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800"
            >
              Place Hold
            </button>

            {message && (
              <p
                className={`text-sm font-medium ${
                  message.includes("Please")
                    ? "text-red-700"
                    : "text-green-700"
                }`}
              >
                {message}
              </p>
            )}

            <p className="text-sm text-gray-500 pt-2">
              <span className="text-red-600 font-semibold">*</span> indicates a
              required field.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}