import { useEffect, useMemo, useState } from "react";
import NavigationBar from "../components/NavigationBar";
import { useLocation } from "react-router-dom";

const getItemTypeLabel = (type) => {
  switch (Number(type)) {
    case 1:
      return "Book";
    case 2:
      return "CD";
    case 3:
      return "Device";
    default:
      return "Unknown";
  }
};

const getFeeTypeLabel = (type) => {
  switch (Number(type)) {
    case 1:
      return "Late";
    case 2:
      return "Damage";
    case 3:
      return "Loss";
    default:
      return "Unknown";
  }
};

const getStatusLabel = (status) => {
  switch (Number(status)) {
    case 1:
      return "Unpaid";
    case 2:
      return "Paid";
    default:
      return "Unknown";
  }
};

export default function PayFeesPage() {
  const [personId, setPersonId] = useState("");
  const [fees, setFees] = useState([]);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("1");
  const [message, setMessage] = useState("");

  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const queryPersonId = params.get("personId");
  const staffView = params.get("staffView") === "true";

  const token = sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setMessage("No user token found. Please log in again.");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentPersonId = payload.person_id;

      const idToUse = staffView && queryPersonId ? queryPersonId : currentPersonId;

      setPersonId(idToUse);
      fetchUserFees(idToUse);
    } catch (error) {
      console.error(error);
      setMessage("Unable to read user information.");
    }
  }, [token, queryPersonId, staffView]);

  const fetchUserFees = async (currentPersonId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/fees/${currentPersonId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load fees.");
        return;
      }

      setFees(data);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      const matchesFeeType =
        feeTypeFilter === "All" || String(fee.fee_type) === feeTypeFilter;

      const matchesStatus =
        statusFilter === "All" || String(fee.status) === statusFilter;

      return matchesFeeType && matchesStatus;
    });
  }, [fees, feeTypeFilter, statusFilter]);

  const handleProcessPayment = async () => {
    setMessage("");

    if (!selectedFeeId) {
      setMessage("Please select a fee to pay.");
      return;
    }

    if (!paymentMethod) {
      setMessage("Please select a payment method.");
      return;
    }

    const methodValue = paymentMethod === "Cash" ? 1 : 2;

    try {
      const response = await fetch("http://localhost:3000/api/fees/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fine_id: selectedFeeId,
          method: methodValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to process payment.");
        return;
      }

      setMessage("Payment processed successfully.");
      setSelectedFeeId("");
      setPaymentMethod("");
      fetchUserFees(personId);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">
          Pay Fees
        </h1>
        <p className="text-gray-600 mb-8">
          View your outstanding fees and select one to pay.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-8">
          {/* USER INFO */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              User Information
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={personId}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          {/* FILTERS */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Filter Fees
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fee Type
                </label>
                <select
                  value={feeTypeFilter}
                  onChange={(e) => setFeeTypeFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                >
                  <option value="All">All</option>
                  <option value="1">Late</option>
                  <option value="2">Damage</option>
                  <option value="3">Loss</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fee Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                >
                  <option value="All">All</option>
                  <option value="1">Unpaid</option>
                  <option value="2">Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* FEES TABLE */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              My Fees
            </h2>

            {filteredFees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2">Select</th>
                      <th className="text-left px-4 py-2">Fine ID</th>
                      <th className="text-left px-4 py-2">Item ID</th>
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-left px-4 py-2">Fee Type</th>
                      <th className="text-left px-4 py-2">Amount</th>
                      <th className="text-left px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((fee) => (
                      <tr
                        key={fee.Fine_ID}
                        className="border-t border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name="selectedFee"
                            value={fee.Fine_ID}
                            checked={String(selectedFeeId) === String(fee.Fine_ID)}
                            onChange={() => setSelectedFeeId(fee.Fine_ID)}
                          />
                        </td>
                        <td className="px-4 py-2">{fee.Fine_ID}</td>
                        <td className="px-4 py-2">{fee.Item_ID}</td>
                        <td className="px-4 py-2">{fee.Item_name}</td>
                        <td className="px-4 py-2">
                          {getItemTypeLabel(fee.Item_type)}
                        </td>
                        <td className="px-4 py-2">
                          {getFeeTypeLabel(fee.fee_type)}
                        </td>
                        <td className="px-4 py-2">${fee.fee_amount}</td>
                        <td className="px-4 py-2">
                          {getStatusLabel(fee.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">
                No fees found for this account.
              </p>
            )}
          </div>

          {/* PAYMENT SECTION */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">
              Payment Information
            </h2>

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
              onClick={handleProcessPayment}
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800"
            >
              Pay Selected Fee
            </button>
          </div>

          {message && (
            <p
              className={`text-sm font-medium ${
                message.includes("success") ? "text-green-700" : "text-red-700"
              }`}
            >
              {message}
            </p>
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