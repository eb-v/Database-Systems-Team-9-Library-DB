import { useState } from "react";
import NavigationBar from "../components/NavigationBar";

export default function ReturnsBorrowsPage() {
  const [action, setAction] = useState("Borrow");
  const [borrowedItemId, setBorrowedItemId] = useState("");
  const [borrowDate, setBorrowDate] = useState("");
  const [returnByDate, setReturnByDate] = useState("");
  const [personId, setPersonId] = useState("");
  const [copyId, setCopyId] = useState("");
  const [message, setMessage] = useState("");

  const handleActionChange = (e) => {
    setAction(e.target.value);
    setBorrowedItemId("");
    setBorrowDate("");
    setReturnByDate("");
    setPersonId("");
    setCopyId("");
    setMessage("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!borrowedItemId || !personId || !copyId) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (action === "Borrow" && (!borrowDate || !returnByDate)) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (action === "Borrow") {
      setMessage("Borrow transaction recorded.");
    } else {
      setMessage("Return transaction recorded.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          Borrow / Return Items
        </h1>
        <p className="text-gray-600 mb-8">
          Process item borrowing and returns for library guests.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Action
            </label>
            <select
              value={action}
              onChange={handleActionChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            >
              <option>Borrow</option>
              <option>Return</option>
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900 mb-2">
              {action} Item
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Borrowed Item ID <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={borrowedItemId}
                onChange={(e) => setBorrowedItemId(e.target.value)}
                placeholder="Enter borrowed item ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            {action === "Borrow" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Borrow Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Return By Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={returnByDate}
                    onChange={(e) => setReturnByDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  />
                </div>
              </>
            )}

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
              className={`px-6 py-3 rounded-lg font-semibold text-white ${
                action === "Borrow"
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-red-800 hover:bg-red-900"
              }`}
            >
              {action === "Borrow" ? "Process Borrow" : "Process Return"}
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