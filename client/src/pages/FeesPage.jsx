import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../api";
import Banner from "../components/Banner";

const ITEM_TYPE_LABEL = { 1: "Book", 2: "CD", 3: "Device" };
const FEE_TYPE_LABEL  = { 1: "Late", 2: "Damage", 3: "Loss" };
const FEE_STATUS      = { 1: "Unpaid", 2: "Paid" };

const BADGE_COLORS = {
  green:  "bg-green-100 text-green-800",
  red:    "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  gray:   "bg-gray-100 text-gray-600",
};

function Badge({ label, color = "gray" }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_COLORS[color] ?? BADGE_COLORS.gray}`}>
      {label}
    </span>
  );
}

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PayFeesPage() {
  const [personId, setPersonId] = useState("");
  const [fees, setFees] = useState([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState(new Set());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("1");
  const [message, setMessage] = useState({ text: "", success: true });

  const navigate = useNavigate();
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryPersonId = params.get("personId");
  const staffView = params.get("staffView") === "true";
  const token = sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setMessage({ text: "No user token found. Please log in again.", success: false });
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
      setMessage({ text: "Unable to read user information.", success: false });
    }
  }, [token, queryPersonId, staffView]);

  const fetchUserFees = async (currentPersonId) => {
    try {
      const response = await apiFetch(`/api/fees/${currentPersonId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ text: data.error || "Failed to load fees.", success: false });
        return;
      }
      setFees(data);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  };

  const unpaidFees  = useMemo(() => fees.filter((f) => Number(f.status) === 1), [fees]);
  const unpaidTotal = useMemo(() => unpaidFees.reduce((sum, f) => sum + Number(f.fee_amount), 0), [unpaidFees]);

  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      const matchesFeeType = feeTypeFilter === "All" || String(fee.fee_type) === feeTypeFilter;
      const matchesStatus  = statusFilter === "All"  || String(fee.status)   === statusFilter;
      return matchesFeeType && matchesStatus;
    });
  }, [fees, feeTypeFilter, statusFilter]);

  const selectableInView = filteredFees.filter((f) => Number(f.status) === 1);
  const allInViewSelected = selectableInView.length > 0 && selectableInView.every((f) => selectedFeeIds.has(String(f.Fine_ID)));

  const toggleFee = (fineId) => {
    setSelectedFeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(fineId))) next.delete(String(fineId));
      else next.add(String(fineId));
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allInViewSelected) {
      setSelectedFeeIds((prev) => {
        const next = new Set(prev);
        selectableInView.forEach((f) => next.delete(String(f.Fine_ID)));
        return next;
      });
    } else {
      setSelectedFeeIds((prev) => {
        const next = new Set(prev);
        selectableInView.forEach((f) => next.add(String(f.Fine_ID)));
        return next;
      });
    }
  };

  const selectedFees = useMemo(
    () => fees.filter((f) => selectedFeeIds.has(String(f.Fine_ID))),
    [fees, selectedFeeIds]
  );
  const selectedTotal = useMemo(
    () => selectedFees.reduce((sum, f) => sum + Number(f.fee_amount), 0),
    [selectedFees]
  );

  const handleProcessPayment = async () => {
    setMessage({ text: "", success: true });
    if (selectedFeeIds.size === 0) {
      setMessage({ text: "Please select at least one fee to pay.", success: false });
      return;
    }
    if (!paymentMethod) {
      setMessage({ text: "Please select a payment method.", success: false });
      return;
    }
    const methodValue = paymentMethod === "Debit" ? 1 : 2;
    const feeIdList = Array.from(selectedFeeIds);
    let successCount = 0;
    let failCount = 0;

    for (const fineId of feeIdList) {
      try {
        const response = await apiFetch("/api/fees/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fine_id: fineId, method: methodValue }),
        });
        if (response.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      setMessage({ text: `${successCount} fee${successCount !== 1 ? "s" : ""} paid successfully.`, success: true });
    } else if (successCount === 0) {
      setMessage({ text: "Failed to process payments. Please try again.", success: false });
    } else {
      setMessage({ text: `${successCount} fee${successCount !== 1 ? "s" : ""} paid, ${failCount} failed.`, success: false });
    }

    setSelectedFeeIds(new Set());
    setPaymentMethod("");
    fetchUserFees(personId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-green-900 mb-2">Pay Fees</h1>
        <p className="text-gray-600 mb-6">View your outstanding fees and select one or more to pay.</p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className={`rounded-xl p-5 shadow-sm border ${unpaidFees.length > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <p className={`text-sm font-semibold uppercase tracking-wide mb-1 ${unpaidFees.length > 0 ? "text-red-600" : "text-green-700"}`}>
              Outstanding Fees
            </p>
            <p className={`text-4xl font-bold ${unpaidFees.length > 0 ? "text-red-700" : "text-green-800"}`}>
              {unpaidFees.length}
            </p>
            <p className={`text-sm mt-1 ${unpaidFees.length > 0 ? "text-red-500" : "text-green-600"}`}>
              {unpaidFees.length === 0 ? "You're all clear!" : `fee${unpaidFees.length !== 1 ? "s" : ""} unpaid`}
            </p>
          </div>

          <div className={`rounded-xl p-5 shadow-sm border ${unpaidTotal > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
            <p className={`text-sm font-semibold uppercase tracking-wide mb-1 ${unpaidTotal > 0 ? "text-orange-600" : "text-green-700"}`}>
              Amount Owed
            </p>
            <p className={`text-4xl font-bold ${unpaidTotal > 0 ? "text-orange-700" : "text-green-800"}`}>
              ${unpaidTotal.toFixed(2)}
            </p>
            <p className={`text-sm mt-1 ${unpaidTotal > 0 ? "text-orange-500" : "text-green-600"}`}>
              total outstanding
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Total Fees</p>
            <p className="text-4xl font-bold text-gray-700">{fees.length}</p>
            <p className="text-sm text-gray-400 mt-1">all time</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-8">

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Type</label>
              <select
                value={feeTypeFilter}
                onChange={(e) => setFeeTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option value="All">All types</option>
                <option value="1">Late</option>
                <option value="2">Damage</option>
                <option value="3">Loss</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option value="All">All statuses</option>
                <option value="1">Unpaid</option>
                <option value="2">Paid</option>
              </select>
            </div>
          </div>

          {/* Fees table */}
          <div>
            <h2 className="text-xl font-semibold text-green-900 mb-4">My Fees</h2>
            {filteredFees.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No fees found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-gray-500 border-b text-xs uppercase">
                      <th className="py-2 pr-4">
                        {selectableInView.length > 0 && (
                          <input
                            type="checkbox"
                            checked={allInViewSelected}
                            onChange={toggleSelectAll}
                            title="Select all unpaid"
                            className="cursor-pointer"
                          />
                        )}
                      </th>
                      <th className="py-2 pr-4">Item</th>
                      <th className="py-2 pr-4">Item Type</th>
                      <th className="py-2 pr-4">Fee Type</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Date Owed</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredFees.map((fee) => {
                      const isPaid    = Number(fee.status) === 2;
                      const isSelected = selectedFeeIds.has(String(fee.Fine_ID));
                      return (
                        <tr
                          key={fee.Fine_ID}
                          onClick={() => !isPaid && toggleFee(fee.Fine_ID)}
                          className={`text-gray-700 transition-colors ${!isPaid ? "cursor-pointer hover:bg-gray-50" : "opacity-50"} ${isSelected ? "bg-green-50" : ""}`}
                        >
                          <td className="py-2 pr-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleFee(fee.Fine_ID)}
                              disabled={isPaid}
                              onClick={(e) => e.stopPropagation()}
                              className="disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            />
                          </td>
                          <td className="py-2 pr-4 font-medium">{fee.Item_name}</td>
                          <td className="py-2 pr-4 text-gray-500">{ITEM_TYPE_LABEL[Number(fee.Item_type)] ?? "—"}</td>
                          <td className="py-2 pr-4">{FEE_TYPE_LABEL[Number(fee.fee_type)] ?? "—"}</td>
                          <td className="py-2 pr-4 font-semibold">${Number(fee.fee_amount).toFixed(2)}</td>
                          <td className="py-2 pr-4">{fmtDate(fee.date_owed)}</td>
                          <td className="py-2">
                            <Badge label={FEE_STATUS[Number(fee.status)] ?? "Unknown"} color={isPaid ? "green" : "red"} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">Payment</h2>

            {selectedFees.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-1">
                {selectedFees.map((fee) => (
                  <div key={fee.Fine_ID} className="flex justify-between text-sm text-blue-900">
                    <span>{fee.Item_name} — {FEE_TYPE_LABEL[Number(fee.fee_type)]} fee</span>
                    <span className="font-semibold">${Number(fee.fee_amount).toFixed(2)}</span>
                  </div>
                ))}
                {selectedFees.length > 1 && (
                  <div className="flex justify-between text-sm font-bold text-blue-900 border-t border-blue-200 pt-1 mt-1">
                    <span>Total ({selectedFees.length} fees)</span>
                    <span>${selectedTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] max-w-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Method <span className="text-red-600">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                >
                  <option value="">Select payment method</option>
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
              <button
                onClick={handleProcessPayment}
                className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 whitespace-nowrap"
              >
                {selectedFees.length > 1 ? `Pay ${selectedFees.length} Fees` : "Pay Selected Fee"}
              </button>
            </div>
          </div>

          <Banner message={message} onDismiss={() => setMessage({ text: "", success: true })} />

        </div>
      </div>
    </div>
  );
}
