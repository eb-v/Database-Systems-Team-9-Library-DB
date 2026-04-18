export const SEARCH_OPTIONS = [
  { value: "all", label: "All Fields", placeholder: "Search by name, username, email, phone, or ID" },
  { value: "name", label: "Name", placeholder: "Search by first name, last name, or full name" },
  { value: "username", label: "Username", placeholder: "Search by username" },
  { value: "email", label: "Email", placeholder: "Search by email address" },
  { value: "phone", label: "Phone", placeholder: "Search by phone number" },
  { value: "personId", label: "Person ID", placeholder: "Search by numeric user ID" },
  { value: "role", label: "Role", type: "role" },
  { value: "accountStatus", label: "Account Status", type: "status" },
  { value: "borrowStatus", label: "Borrow Status", type: "borrowStatus" },
];

export const ROLE_OPTIONS = [
  { value: "2", label: "User" },
  { value: "1", label: "Staff" },
];

export const ACCOUNT_STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

export const BORROW_STATUS_OPTIONS = [
  { value: "1", label: "Good Standing" },
  { value: "0", label: "Restricted" },
];

export const HOLD_STATUS = {
  0: "Cancelled",
  1: "Waiting",
  2: "Ready for Pickup",
  3: "Fulfilled",
};

export const FEE_STATUS = {
  1: "Unpaid",
  2: "Paid",
};

export const RESERVATION_STATUS = {
  0: "Cancelled",
  1: "Active",
  2: "Completed",
};

export const EMPTY_MESSAGE = { text: "", success: true };

export function buildEditForm(person) {
  return {
    firstName: person?.First_name || "",
    lastName: person?.Last_name || "",
    username: person?.username || "",
    email: person?.email || "",
    phoneNumber: person?.phone_number || "",
    birthday: person?.birthday ? String(person.birthday).split("T")[0] : "",
    streetAddress: person?.street_address || "",
    zipCode: person?.zip_code || "",
    accountStatus: person?.account_status != null ? String(person.account_status) : "1",
    borrowStatus: person?.borrow_status != null ? String(person.borrow_status) : "1",
  };
}

export function getAccountStatusLabel(status) {
  return Number(status) === 1 ? "Active" : "Inactive";
}

export function getRoleLabel(role) {
  return Number(role) === 2 ? "User" : "Staff";
}

export function getBorrowStatusLabel(status) {
  return Number(status) === 1 ? "Good Standing" : "Restricted";
}

export function formatFeeType(type) {
  const normalized = Number(type);
  if (normalized === 1) return "Late";
  if (normalized === 2) return "Damage";
  if (normalized === 3) return "Loss";
  return type || "Unknown";
}

export function normalizeDateForJs(value) {
  if (!value) return null;
  return String(value).replace(" ", "T");
}

export function formatDate(value) {
  if (!value) return "-";

  const normalized = normalizeDateForJs(value);
  if (!normalized) return "-";

  return new Date(normalized).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "-";

  const normalized = normalizeDateForJs(value);
  if (!normalized) return "-";

  return new Date(normalized).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(value) {
  if (!value) return "-";

  const [hours = "0", minutes = "0"] = String(value).split(":");
  const hourCount = Number(hours);
  const minuteCount = Number(minutes);

  if (minuteCount === 0) return `${hourCount}h`;
  return `${hourCount}h ${minuteCount}m`;
}

export function isStatusMode(searchMode) {
  return searchMode === "role" || searchMode === "accountStatus" || searchMode === "borrowStatus";
}
