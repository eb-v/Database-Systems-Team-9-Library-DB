import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../components/NavigationBar";
import Banner from "../components/Banner";
import UserLookupSearchSection from "../components/userLookup/UserLookupSearchSection";
import UserLookupDetailsSection from "../components/userLookup/UserLookupDetailsSection";
import { apiFetch } from "../api";
import { EMPTY_MESSAGE, buildEditForm } from "../components/userLookup/userLookupConfig";

const DEFAULT_STATUS_VALUE = "1";
const DEFAULT_ROLE_VALUE = "2";

export default function UserLookupPage() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");
  const userType = sessionStorage.getItem("userType");
  const isStaff = userType === "staff";
  const isAdmin = userType === "admin";

  const [searchMode, setSearchMode] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [statusValue, setStatusValue] = useState(DEFAULT_STATUS_VALUE);

  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  const [userRecord, setUserRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState(EMPTY_MESSAGE);

  const [borrows, setBorrows] = useState(null);
  const [borrowsLoading, setBorrowsLoading] = useState(false);
  const [borrowsOpen, setBorrowsOpen] = useState(false);

  const [holds, setHolds] = useState(null);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);

  const [fees, setFees] = useState(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);

  const [reservations, setReservations] = useState(null);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsOpen, setReservationsOpen] = useState(false);

  const [editForm, setEditForm] = useState(buildEditForm(null));
  const [editMessage, setEditMessage] = useState(EMPTY_MESSAGE);
  const [saveLoading, setSaveLoading] = useState(false);

  const selectedIsUserAccount = Number(userRecord?.role) === 2;

  useEffect(() => {
    resetSelectedPanels();
    setEditForm(buildEditForm(userRecord));
    setEditMessage(EMPTY_MESSAGE);
  }, [userRecord]);

  useEffect(() => {
    async function fetchUsers() {
      setUsersLoading(true);
      setUsersError("");

      try {
        const response = await apiFetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          setUsersError(data.error || "Failed to load users.");
          return;
        }

        setAllUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsersError("Unable to connect to the server.");
      } finally {
        setUsersLoading(false);
      }
    }

    fetchUsers();
  }, [token]);

  const filteredUsers = useMemo(() => {
    const trimmedQuery = searchValue.trim().toLowerCase();

    return allUsers.filter((user) => {
      const fullName = `${user.First_name || ""} ${user.Last_name || ""}`.trim().toLowerCase();
      const searchBuckets = {
        all: [
          fullName,
          user.First_name?.toLowerCase() || "",
          user.Last_name?.toLowerCase() || "",
          user.username?.toLowerCase() || "",
          user.email?.toLowerCase() || "",
          user.phone_number?.toLowerCase() || "",
          String(user.Person_ID || ""),
        ],
        name: [fullName, user.First_name?.toLowerCase() || "", user.Last_name?.toLowerCase() || ""],
        username: [user.username?.toLowerCase() || ""],
        email: [user.email?.toLowerCase() || ""],
        phone: [user.phone_number?.toLowerCase() || ""],
        personId: [String(user.Person_ID || "")],
      };

      if (searchMode === "role") return String(user.role) === statusValue;
      if (searchMode === "accountStatus") return String(user.account_status) === statusValue;
      if (searchMode === "borrowStatus") return String(user.borrow_status) === statusValue;
      if (!trimmedQuery) return true;

      return (searchBuckets[searchMode] || searchBuckets.all).some((value) => value.includes(trimmedQuery));
    });
  }, [allUsers, searchMode, searchValue, statusValue]);

  const displayedUsers = filteredUsers.slice(0, 150);

  const activityPanels = {
    borrows: { data: borrows, loading: borrowsLoading, open: borrowsOpen, onToggle: () => togglePanel("borrows") },
    holds: { data: holds, loading: holdsLoading, open: holdsOpen, onToggle: () => togglePanel("holds") },
    fees: { data: fees, loading: feesLoading, open: feesOpen, onToggle: () => togglePanel("fees") },
    reservations: { data: reservations, loading: reservationsLoading, open: reservationsOpen, onToggle: () => togglePanel("reservations") },
  };

  function resetSelectedPanels() {
    setBorrows(null);
    setBorrowsOpen(false);
    setHolds(null);
    setHoldsOpen(false);
    setFees(null);
    setFeesOpen(false);
    setReservations(null);
    setReservationsOpen(false);
  }

  async function fetchPanel(endpoint, setter, setLoading) {
    setLoading(true);

    try {
      const response = await apiFetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setter(response.ok ? data : []);
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  }

  function togglePanel(panelKey) {
    if (!userRecord) return;

    const panelMap = {
      borrows: {
        open: borrowsOpen,
        data: borrows,
        endpoint: `/api/borrow/${userRecord.Person_ID}`,
        setter: setBorrows,
        setLoading: setBorrowsLoading,
        setOpen: setBorrowsOpen,
      },
      holds: {
        open: holdsOpen,
        data: holds,
        endpoint: `/api/holds/${userRecord.Person_ID}`,
        setter: setHolds,
        setLoading: setHoldsLoading,
        setOpen: setHoldsOpen,
      },
      fees: {
        open: feesOpen,
        data: fees,
        endpoint: `/api/fees/${userRecord.Person_ID}`,
        setter: setFees,
        setLoading: setFeesLoading,
        setOpen: setFeesOpen,
      },
      reservations: {
        open: reservationsOpen,
        data: reservations,
        endpoint: `/api/reservations/${userRecord.Person_ID}`,
        setter: setReservations,
        setLoading: setReservationsLoading,
        setOpen: setReservationsOpen,
      },
    };

    const panel = panelMap[panelKey];
    if (!panel) return;

    if (!panel.open && panel.data === null) {
      fetchPanel(panel.endpoint, panel.setter, panel.setLoading);
    }

    panel.setOpen((current) => !current);
  }

  async function loadUser(personId) {
    setMessage(EMPTY_MESSAGE);

    try {
      const response = await apiFetch(`/api/users/lookup?searchBy=personId&value=${personId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.error || "Failed to load user record.", success: false });
        return;
      }

      setUserRecord(data.person);
      setSummary(data.summary);
    } catch {
      setMessage({ text: "Unable to connect to the server.", success: false });
    }
  }

  function handleSearchModeChange(nextMode) {
    setSearchMode(nextMode);
    setMessage(EMPTY_MESSAGE);

    if (nextMode === "role") {
      setStatusValue(DEFAULT_ROLE_VALUE);
      return;
    }

    if (nextMode === "accountStatus" || nextMode === "borrowStatus") {
      setStatusValue(DEFAULT_STATUS_VALUE);
      return;
    }

    setSearchValue("");
  }

  function handleQuickFilter(mode, value) {
    setSearchMode(mode);
    setStatusValue(value);
    setSearchValue("");
    setMessage(EMPTY_MESSAGE);
  }

  function clearFilters() {
    setSearchMode("all");
    setSearchValue("");
    setStatusValue(DEFAULT_STATUS_VALUE);
    setMessage(EMPTY_MESSAGE);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSave() {
    if (!userRecord) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
    const zipRegex = /^\d{5}$/;

    if (!editForm.firstName.trim()) return setEditMessage({ text: "First name is required.", success: false });
    if (!editForm.lastName.trim()) return setEditMessage({ text: "Last name is required.", success: false });
    if (!editForm.username.trim()) return setEditMessage({ text: "Username is required.", success: false });
    if (!emailRegex.test(editForm.email.trim())) return setEditMessage({ text: "Please enter a valid email address.", success: false });
    if (editForm.phoneNumber.trim() && !phoneRegex.test(editForm.phoneNumber.trim())) return setEditMessage({ text: "Please enter a valid phone number.", success: false });
    if (editForm.zipCode.trim() && !zipRegex.test(editForm.zipCode.trim())) return setEditMessage({ text: "Zip code must be 5 digits.", success: false });
    if (editForm.birthday && new Date(editForm.birthday) > new Date()) return setEditMessage({ text: "Birthday cannot be in the future.", success: false });

    setSaveLoading(true);
    setEditMessage(EMPTY_MESSAGE);

    try {
      const response = await apiFetch(`/api/users/${userRecord.Person_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          username: editForm.username,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          birthday: editForm.birthday,
          streetAddress: editForm.streetAddress,
          zipCode: editForm.zipCode,
          accountStatus: Number(editForm.accountStatus),
          borrowStatus: Number(editForm.borrowStatus),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditMessage({ text: data.error || "Failed to save changes.", success: false });
        return;
      }

      setUserRecord(data.person);
      setSummary(data.summary);
      setAllUsers((current) =>
        current.map((user) => (user.Person_ID === data.person.Person_ID ? { ...user, ...data.person } : user))
      );
      setEditMessage({ text: "User details updated successfully.", success: true });
      setMessage({ text: "Selected user record refreshed.", success: true });
    } catch {
      setEditMessage({ text: "Unable to connect to the server.", success: false });
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar isStaff />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : isStaff ? "/staff" : "/view-account")}
          className="mb-6 inline-block text-sm font-semibold text-green-900 hover:underline"
        >
          {"< Back"}
        </button>

        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-green-900">User Lookup</h1>
            <p className="mt-2 max-w-3xl text-gray-600">
              Search users by multiple identifiers, review current account activity, and
              {isAdmin ? " update user information from one place." : " review account details from one place."}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            {isAdmin
              ? "Admin: user records can be edited below."
              : "Staff: records are view-only on this page."}
          </div>
        </div>

        <div className="space-y-8 rounded-2xl bg-white p-6 shadow-md">
          <UserLookupSearchSection
            searchMode={searchMode}
            searchValue={searchValue}
            statusValue={statusValue}
            usersLoading={usersLoading}
            usersError={usersError}
            filteredUsers={filteredUsers}
            displayedUsers={displayedUsers}
            selectedUserId={userRecord?.Person_ID}
            onSearchModeChange={handleSearchModeChange}
            onSearchValueChange={setSearchValue}
            onStatusValueChange={setStatusValue}
            onQuickFilter={handleQuickFilter}
            onClearFilters={clearFilters}
            onSelectUser={loadUser}
          />

          <Banner message={message} onDismiss={() => setMessage(EMPTY_MESSAGE)} />

          <UserLookupDetailsSection
            userRecord={userRecord}
            summary={summary}
            isAdmin={isAdmin}
            selectedIsUserAccount={selectedIsUserAccount}
            editForm={editForm}
            editMessage={editMessage}
            saveLoading={saveLoading}
            activityPanels={activityPanels}
            onClearSelection={() => {
              setUserRecord(null);
              setSummary(null);
              setMessage(EMPTY_MESSAGE);
            }}
            onEditChange={handleEditChange}
            onSave={handleSave}
            onResetEdit={() => setEditForm(buildEditForm(userRecord))}
            onDismissEditMessage={() => setEditMessage(EMPTY_MESSAGE)}
          />
        </div>
      </div>
    </div>
  );
}
