import { useState, useEffect } from "react";
import NavigationBar from "../components/NavigationBar";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import Banner from "../components/Banner";

const getAccountStatusLabel = (status) => (Number(status) === 1 ? "Active" : "Inactive");
const getBorrowStatusLabel  = (status) => (Number(status) === 1 ? "Good Standing" : "Restricted");

const HOLD_STATUS  = { 0: "Cancelled", 1: "Waiting", 2: "Ready for Pickup", 3: "Fulfilled" };
const COPY_STATUS  = { 1: "Available", 2: "Checked Out", 3: "On Hold" };
const FEE_STATUS   = { 1: "Unpaid", 2: "Paid" };

export default function UserLookupPage() {
  const navigate   = useNavigate();
  const token      = sessionStorage.getItem("token");
  const userType   = sessionStorage.getItem("userType");
  const isStaff    = userType === "staff";
  const isAdmin    = userType === "admin";

  const [searchValue,   setSearchValue]   = useState("");
  const [userRecord,    setUserRecord]    = useState(null);
  const [summary,       setSummary]       = useState(null);
  const [results,       setResults]       = useState(null);
  const [message,       setMessage]       = useState({ text: "", success: true });
  const [allUsers,      setAllUsers]      = useState([]);
  const [usersLoading,  setUsersLoading]  = useState(true);

  // panel state: data (null = not fetched), loading, open
  const [borrows,        setBorrows]        = useState(null);
  const [borrowsLoading, setBorrowsLoading] = useState(false);
  const [borrowsOpen,    setBorrowsOpen]    = useState(false);

  const [holds,        setHolds]        = useState(null);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [holdsOpen,    setHoldsOpen]    = useState(false);

  const [fees,        setFees]        = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesOpen,    setFeesOpen]    = useState(false);

  useEffect(() => {
    apiFetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllUsers(data); })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

  // reset all panel data when the loaded user changes
  useEffect(() => {
    setBorrows(null); setBorrowsOpen(false);
    setHolds(null);   setHoldsOpen(false);
    setFees(null);    setFeesOpen(false);
  }, [userRecord?.Person_ID]);

  const fetchPanel = async (endpoint, setter, setLoading) => {
    setLoading(true);
    try {
      const r    = await apiFetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setter(r.ok ? data : []);
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleBorrows = () => {
    if (!borrowsOpen && borrows === null)
      fetchPanel(`/api/borrow/${userRecord.Person_ID}`, setBorrows, setBorrowsLoading);
    setBorrowsOpen((o) => !o);
  };

  const toggleHolds = () => {
    if (!holdsOpen && holds === null)
      fetchPanel(`/api/holds/${userRecord.Person_ID}`, setHolds, setHoldsLoading);
    setHoldsOpen((o) => !o);
  };

  const toggleFees = () => {
    if (!feesOpen && fees === null)
      fetchPanel(`/api/fees/${userRecord.Person_ID}`, setFees, setFeesLoading);
    setFeesOpen((o) => !o);
  };

  const handleSearch = async () => {
    setMessage({ text: "", success: true });
    setUserRecord(null);
    setSummary(null);
    setResults(null);

    if (!searchValue.trim()) {
      setMessage({ text: "Please enter a search value.", success: false });
      return;
    }

    try {
      const response = await apiFetch(
        `/api/users/lookup?searchBy=all&value=${encodeURIComponent(searchValue)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (!response.ok) { setMessage({ text: data.error || "Failed to load user record.", success: false }); return; }

      if (data.results) {
        setResults(data.results);
        setMessage({ text: `${data.results.length} result${data.results.length !== 1 ? "s" : ""} found.`, success: true });
      } else {
        setUserRecord(data.person);
        setSummary(data.summary);
      }
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  };

  const handleSelectResult = async (personId) => {
    setMessage({ text: "", success: true });
    setResults(null);
    try {
      const response = await apiFetch(
        `/api/users/lookup?searchBy=personId&value=${personId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (!response.ok) { setMessage({ text: data.error || "Failed to load user record.", success: false }); return; }
      setUserRecord(data.person);
      setSummary(data.summary);
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff={true} />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
          className="text-sm text-green-900 font-semibold hover:underline mb-6 inline-block"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-green-900 mb-2">User Lookup</h1>
        <p className="text-gray-600 mb-8">
          Search for a library guest and view their current borrowing and fee information.
        </p>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-8">

          {/* ── Search ── */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-900">Search User</h2>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setResults(null); setMessage({ text: "", success: true }); setUserRecord(null); setSummary(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name, username, email, phone, or ID..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
            {/* ── User list (filtered live or API results) ── */}
            <div className="divide-y border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
              {usersLoading ? (
                <p className="px-4 py-3 text-sm text-gray-400 italic">Loading users...</p>
              ) : (() => {
                const q = searchValue.toLowerCase();
                const displayList = results ?? (
                  q
                    ? allUsers.filter((u) =>
                        u.First_name?.toLowerCase().includes(q) ||
                        u.Last_name?.toLowerCase().includes(q)  ||
                        u.username?.toLowerCase().includes(q)   ||
                        u.email?.toLowerCase().includes(q)      ||
                        String(u.Person_ID).includes(q)
                      )
                    : allUsers
                );
                if (displayList.length === 0)
                  return <p className="px-4 py-3 text-sm text-gray-400 italic">No users found.</p>;
                return displayList.map((u) => (
                  <button
                    key={u.Person_ID}
                    onClick={() => handleSelectResult(u.Person_ID)}
                    className={`w-full text-left px-4 py-3 hover:bg-green-50 flex justify-between items-center transition-colors ${userRecord?.Person_ID === u.Person_ID ? "bg-green-50" : ""}`}
                  >
                    <span className="font-semibold text-gray-800">{u.First_name} {u.Last_name}</span>
                    <span className="text-sm text-gray-500">{u.email} · ID {u.Person_ID}</span>
                  </button>
                ));
              })()}
            </div>
          </div>

          <Banner message={message} onDismiss={() => setMessage({ text: "", success: true })} />

          {/* ── User details + panels ── */}
          {userRecord && (
          <div className="space-y-8">

            {/* User Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-green-900">User Details</h2>
                <button
                  onClick={() => { setUserRecord(null); setSummary(null); setMessage({ text: "", success: true }); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField label="Username"       value={userRecord.username} />
                <ReadOnlyField label="Person ID"      value={userRecord.Person_ID} />
                <ReadOnlyField label="Name"           value={`${userRecord.First_name} ${userRecord.Last_name}`} />
                <ReadOnlyField label="Email"          value={userRecord.email} />
                <ReadOnlyField label="Phone"          value={userRecord.phone_number || "—"} />
                <ReadOnlyField label="Account Status" value={getAccountStatusLabel(userRecord.account_status)} />
                <ReadOnlyField label="Borrow Status"  value={getBorrowStatusLabel(userRecord.borrow_status)} />
              </div>
            </div>

            {/* Account Summary */}
            {summary && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-green-900">Account Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SummaryCard title="Borrowed Items"   value={summary.activeBorrows}        description="Items currently checked out" />
                  <SummaryCard title="Outstanding Fees" value={`$${summary.unpaidFeeTotal}`} description={`${summary.unpaidFeeCount} unpaid fee(s)`} />
                  <SummaryCard title="Active Holds"     value={summary.activeHolds}          description="Items currently on hold" />
                </div>
              </div>
            )}

            {/* Expandable panels */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-green-900">Details</h2>

              <AccordionPanel label="Borrowed Items" count={summary?.activeBorrows} open={borrowsOpen} onToggle={toggleBorrows} loading={borrowsLoading} color="green">
                {borrows && (
                  borrows.length === 0
                    ? <EmptyState text="No borrow history found." />
                    : <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-gray-500 border-b text-xs uppercase">
                            <th className="py-2 pr-4">Item</th>
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">Borrowed</th>
                            <th className="py-2 pr-4">Due</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {borrows.map((b) => {
                            const active  = b.Copy_status === 2;
                            const overdue = active && new Date(b.returnBy_date) < new Date();
                            return (
                              <tr key={b.BorrowedItem_ID} className="text-gray-700">
                                <td className="py-2 pr-4 font-medium">{b.Item_name}</td>
                                <td className="py-2 pr-4 text-gray-500">{b.Item_type}</td>
                                <td className="py-2 pr-4">{fmtDate(b.borrow_date)}</td>
                                <td className="py-2 pr-4">{fmtDate(b.returnBy_date)}</td>
                                <td className="py-2">
                                  {active
                                    ? <Badge label={overdue ? "Overdue" : "Checked Out"} color={overdue ? "red" : "yellow"} />
                                    : <Badge label="Returned" color="green" />}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                )}
              </AccordionPanel>

              <AccordionPanel label="Holds" count={summary?.activeHolds} open={holdsOpen} onToggle={toggleHolds} loading={holdsLoading} color="blue">
                {holds && (
                  holds.length === 0
                    ? <EmptyState text="No holds found." />
                    : <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-gray-500 border-b text-xs uppercase">
                            <th className="py-2 pr-4">Item</th>
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Queue</th>
                            <th className="py-2 pr-4">Hold Date</th>
                            <th className="py-2">Expires</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {holds.map((h) => (
                            <tr key={h.Hold_ID} className="text-gray-700">
                              <td className="py-2 pr-4 font-medium">{h.Item_name}</td>
                              <td className="py-2 pr-4 text-gray-500">{h.Item_type}</td>
                              <td className="py-2 pr-4">
                                <Badge
                                  label={HOLD_STATUS[h.hold_status] ?? "Unknown"}
                                  color={h.hold_status === 3 ? "green" : h.hold_status === 2 ? "green" : h.hold_status === 1 ? "yellow" : "red"}
                                />
                              </td>
                              <td className="py-2 pr-4">#{h.queue_status + 1}</td>
                              <td className="py-2 pr-4">{fmtDate(h.hold_date)}</td>
                              <td className="py-2">{h.expiry_date ? fmtDate(h.expiry_date) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                )}
              </AccordionPanel>

              <AccordionPanel label="Fees" count={summary?.unpaidFeeCount} open={feesOpen} onToggle={toggleFees} loading={feesLoading} color="purple">
                {fees && (
                  fees.length === 0
                    ? <EmptyState text="No fees found." />
                    : <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-gray-500 border-b text-xs uppercase">
                            <th className="py-2 pr-4">Item</th>
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">Fee Type</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Date Owed</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {fees.map((f) => (
                            <tr key={f.Fine_ID} className="text-gray-700">
                              <td className="py-2 pr-4 font-medium">{f.Item_name}</td>
                              <td className="py-2 pr-4 text-gray-500">{f.Item_type}</td>
                              <td className="py-2 pr-4">{f.fee_type}</td>
                              <td className="py-2 pr-4 font-semibold">${Number(f.fee_amount).toFixed(2)}</td>
                              <td className="py-2 pr-4">{fmtDate(f.date_owed)}</td>
                              <td className="py-2">
                                <Badge
                                  label={FEE_STATUS[Number(f.status)] ?? "Unknown"}
                                  color={Number(f.status) === 1 ? "red" : "green"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                )}
              </AccordionPanel>
            </div>

          </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const BADGE_COLORS = {
  green:  "bg-green-100 text-green-800",
  blue:   "bg-blue-100 text-blue-800",
  red:    "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  purple: "bg-purple-100 text-purple-800",
  gray:   "bg-gray-100 text-gray-600",
};

const PANEL_COLORS = {
  green:  "hover:bg-green-50",
  blue:   "hover:bg-blue-50",
  purple: "hover:bg-purple-50",
};

function Badge({ label, color = "gray" }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_COLORS[color] ?? BADGE_COLORS.gray}`}>
      {label}
    </span>
  );
}

function AccordionPanel({ label, count, open, onToggle, loading, color = "green", children }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-800 ${PANEL_COLORS[color]} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <span>{label}</span>
          {count != null && count > 0 && (
            <Badge label={count} color={color} />
          )}
        </div>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 py-4 border-t overflow-x-auto">
          {loading ? <p className="text-sm text-gray-400 italic">Loading...</p> : children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-gray-400 italic">{text}</p>;
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-green-900 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
