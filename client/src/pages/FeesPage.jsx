import { useState } from "react";
import NavigationBar from "../components/NavigationBar";

export default function FeesPage() {
  const [fineId, setFineId] = useState("");
  const [personId, setPersonId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      {/*to show the staff option navbar*/}
      <NavigationBar isStaff={true} />

      {/*Fee process card*/}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          Process Fees
        </h1>
        <p className="text-gray-600 mb-8">
          Search for a fee record and process a payment.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-8">
          {/* FIND FEE SECTION */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Find Fee
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fine ID <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={fineId}
                onChange={(e) => setFineId(e.target.value)}
                placeholder="Enter fine ID"
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

            <button
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800"
              onClick={() => setMessage("Fee record loaded.")}
            >
              Load Fee
            </button>
          </div>

          {/* FEE DETAILS SECTION */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Fee Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Owed
                </label>
                <input
                  type="text"
                  value="03/15/2026"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <input
                  type="text"
                  value="Due"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Late Fee Amount
                </label>
                <input
                  type="text"
                  value="$15.00"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Borrowed Item ID
                </label>
                <input
                  type="text"
                  value="5501"
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* PROCESS PAYMENT SECTION */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Record Payment
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment ID <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="Enter payment ID"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method <span className="text-red-600">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option value="">Select payment method</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>

            <button
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800"
              onClick={() => setMessage("Payment recorded successfully.")}
            >
              Process Payment
            </button>
          </div>

          {message && (
            <p className="text-sm text-green-700 font-medium">{message}</p>
          )}

          <p className="text-sm text-gray-500 pt-2">
            <span className="text-red-600 font-semibold">*</span> indicates a
            required field.
          </p>
        </div>
      </div>
    </div>
  );
}