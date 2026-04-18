import {
  ROLE_OPTIONS,
  ACCOUNT_STATUS_OPTIONS,
  BORROW_STATUS_OPTIONS,
  SEARCH_OPTIONS,
  getRoleLabel,
  getAccountStatusLabel,
  getBorrowStatusLabel,
  isStatusMode,
} from "./userLookupConfig";
import { QuickFilterButton, StatusBadge } from "./UserLookupUi";

export default function UserLookupSearchSection({
  searchMode,
  searchValue,
  statusValue,
  usersLoading,
  usersError,
  filteredUsers,
  displayedUsers,
  selectedUserId,
  onSearchModeChange,
  onSearchValueChange,
  onStatusValueChange,
  onQuickFilter,
  onClearFilters,
  onSelectUser,
}) {
  const filterOptions =
    searchMode === "role"
      ? ROLE_OPTIONS
      : searchMode === "accountStatus"
        ? ACCOUNT_STATUS_OPTIONS
        : BORROW_STATUS_OPTIONS;
  const quickFilters = [
    { mode: "role", value: "2", label: "User Accounts" },
    { mode: "role", value: "1", label: "Staff Accounts" },
    { mode: "accountStatus", value: "1", label: "Active Accounts" },
    { mode: "accountStatus", value: "0", label: "Inactive Accounts" },
    { mode: "borrowStatus", value: "0", label: "Restricted Borrowing" },
  ];
  const selectedLookupLabel =
    SEARCH_OPTIONS.find((option) => option.value === searchMode)?.label || "All Fields";
  const selectedFilterLabel = isStatusMode(searchMode)
    ? filterOptions.find((option) => option.value === statusValue)?.label || "All"
    : searchValue.trim() || "Any value";

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-emerald-50 p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),minmax(340px,420px)] xl:items-start">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Lookup Workspace</p>
              <h2 className="mt-2 text-2xl font-semibold text-green-950">Search Users</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Filter by identity, contact details, role, or account standing from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200">
                Lookup By: <span className="font-semibold text-gray-900">{selectedLookupLabel}</span>
              </span>
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200">
                Current Filter: <span className="font-semibold text-gray-900">{selectedFilterLabel}</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Quick Filters</p>
                <p className="text-xs text-gray-500">Jump to the most common account views.</p>
              </div>
              <button
                type="button"
                onClick={onClearFilters}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                Clear All
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <QuickFilterButton
                  key={`${filter.mode}-${filter.value}`}
                  active={searchMode === filter.mode && statusValue === filter.value}
                  label={filter.label}
                  onClick={() => onQuickFilter(filter.mode, filter.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[220px,1fr]">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Lookup By</span>
          <select
            value={searchMode}
            onChange={(event) => onSearchModeChange(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 transition-colors focus:border-green-700 focus:bg-white focus:outline-none"
          >
            {SEARCH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isStatusMode(searchMode) ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Filter Value</span>
            <select
              value={statusValue}
              onChange={(event) => onStatusValueChange(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 transition-colors focus:border-green-700 focus:bg-white focus:outline-none"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Search Value</span>
            <input
              type={searchMode === "personId" ? "number" : "text"}
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              placeholder={SEARCH_OPTIONS.find((option) => option.value === searchMode)?.placeholder}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 transition-colors focus:border-green-700 focus:bg-white focus:outline-none"
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-700">
          {usersLoading
            ? "Loading user list..."
            : `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""} match the current filter.`}
        </span>
        {filteredUsers.length > displayedUsers.length && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
            Showing the first {displayedUsers.length} matches
          </span>
        )}
      </div>

      {usersError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {usersError}
        </div>
      )}

      {!usersError && (
        <div className="max-h-[32rem] divide-y overflow-y-auto rounded-xl border">
          {usersLoading ? (
            <p className="px-4 py-3 text-sm italic text-gray-400">Loading users...</p>
          ) : displayedUsers.length === 0 ? (
            <p className="px-4 py-3 text-sm italic text-gray-400">No users match the current filter.</p>
          ) : (
            displayedUsers.map((user) => (
              <button
                key={user.Person_ID}
                type="button"
                onClick={() => onSelectUser(user.Person_ID)}
                className={`w-full px-4 py-4 text-left transition-colors hover:bg-green-50 ${
                  selectedUserId === user.Person_ID ? "bg-green-50" : ""
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {user.First_name} {user.Last_name}
                      </span>
                      <StatusBadge
                        label={getRoleLabel(user.role)}
                        color={Number(user.role) === 2 ? "gray" : "purple"}
                      />
                      <StatusBadge
                        label={getAccountStatusLabel(user.account_status)}
                        color={Number(user.account_status) === 1 ? "green" : "red"}
                      />
                      <StatusBadge
                        label={getBorrowStatusLabel(user.borrow_status)}
                        color={Number(user.borrow_status) === 1 ? "blue" : "yellow"}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      @{user.username || "no-username"} | ID {user.Person_ID}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 md:text-right">
                    <p>{user.email || "No email on file"}</p>
                    <p>{user.phone_number || "No phone on file"}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}
