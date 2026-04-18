import Banner from "../Banner";
import {
  FEE_STATUS,
  HOLD_STATUS,
  RESERVATION_STATUS,
  formatDate,
  formatDateTime,
  formatDuration,
  formatFeeType,
  getAccountStatusLabel,
  getBorrowStatusLabel,
  getRoleLabel,
} from "./userLookupConfig";
import {
  AccordionPanel,
  DetailGroup,
  EmptyState,
  Field,
  StatusBadge,
  SummaryCard,
} from "./UserLookupUi";

export default function UserLookupDetailsSection({
  userRecord,
  summary,
  isAdmin,
  selectedIsUserAccount,
  editForm,
  editMessage,
  saveLoading,
  activityPanels,
  onClearSelection,
  onEditChange,
  onSave,
  onResetEdit,
  onDismissEditMessage,
}) {
  if (!userRecord) return null;

  const activityConfig = [
    {
      key: "borrows",
      label: "Borrowed Items",
      count: summary?.activeBorrows,
      color: "green",
      emptyText: "No borrow history found.",
      content: <BorrowTable rows={activityPanels.borrows.data} />,
    },
    {
      key: "holds",
      label: "Holds",
      count: summary?.activeHolds,
      color: "blue",
      emptyText: "No holds found.",
      content: <HoldTable rows={activityPanels.holds.data} />,
    },
    {
      key: "fees",
      label: "Fees",
      count: summary?.unpaidFeeCount,
      color: "purple",
      emptyText: "No fees found.",
      content: <FeeTable rows={activityPanels.fees.data} />,
    },
    {
      key: "reservations",
      label: "Room Reservations",
      count: summary?.activeReservations,
      color: "gray",
      emptyText: "No room reservations found.",
      content: <ReservationTable rows={activityPanels.reservations.data} />,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-green-900">User Details</h2>
            <p className="text-sm text-gray-500">
              Selected record for {userRecord.First_name} {userRecord.Last_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear Selection
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-xl border border-gray-200 p-5 lg:grid-cols-3">
          <DetailGroup
            title="Identity"
            fields={[
              { label: "Person ID", value: userRecord.Person_ID },
              { label: "Name", value: `${userRecord.First_name} ${userRecord.Last_name}` },
              { label: "Username", value: userRecord.username },
              { label: "Birthday", value: formatDate(userRecord.birthday) },
            ]}
          />
          <DetailGroup
            title="Contact"
            fields={[
              { label: "Email", value: userRecord.email },
              { label: "Phone", value: userRecord.phone_number },
              { label: "Street Address", value: userRecord.street_address },
              { label: "Zip Code", value: userRecord.zip_code },
            ]}
          />
          <DetailGroup
            title="Account"
            fields={[
              { label: "Role", value: getRoleLabel(userRecord.role) },
              { label: "Account Status", value: getAccountStatusLabel(userRecord.account_status) },
              { label: "Borrow Status", value: getBorrowStatusLabel(userRecord.borrow_status) },
              {
                label: "Next Reservation",
                value: summary?.nextReservationStart ? formatDateTime(summary.nextReservationStart) : "None scheduled",
              },
            ]}
          />
        </div>
      </section>

      {summary && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-green-900">Account Summary</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Borrowed Items" value={summary.activeBorrows} description="Currently checked out" />
            <SummaryCard
              title="Outstanding Fees"
              value={`$${Number(summary.unpaidFeeTotal || 0).toFixed(2)}`}
              description={`${summary.unpaidFeeCount} unpaid fee(s)`}
            />
            <SummaryCard title="Active Holds" value={summary.activeHolds} description="Waiting or ready for pickup" />
            <SummaryCard
              title="Room Reservations"
              value={summary.activeReservations}
              description={
                summary.nextReservationStart
                  ? `Next: ${formatDateTime(summary.nextReservationStart)}`
                  : "No active room bookings"
              }
            />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-green-900">Account Activity</h2>
        {activityConfig.map((panel) => (
          <AccordionPanel
            key={panel.key}
            label={panel.label}
            count={panel.count}
            open={activityPanels[panel.key].open}
            onToggle={activityPanels[panel.key].onToggle}
            loading={activityPanels[panel.key].loading}
            color={panel.color}
          >
            {activityPanels[panel.key].data?.length === 0 ? (
              <EmptyState text={panel.emptyText} />
            ) : (
              panel.content
            )}
          </AccordionPanel>
        ))}
      </section>

      {isAdmin && selectedIsUserAccount && (
        <section className="space-y-4 rounded-xl border border-gray-200 p-5">
          <div>
            <h2 className="text-xl font-semibold text-green-900">Edit User Information</h2>
            <p className="text-sm text-gray-500">
              Update contact details and account standing. Borrow status may still change automatically when fees are added or paid.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="First Name" required>
              <input type="text" name="firstName" value={editForm.firstName} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Last Name" required>
              <input type="text" name="lastName" value={editForm.lastName} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Username" required>
              <input type="text" name="username" value={editForm.username} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Email" required>
              <input type="email" name="email" value={editForm.email} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Phone Number">
              <input type="text" name="phoneNumber" value={editForm.phoneNumber} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Birthday">
              <input type="date" name="birthday" value={editForm.birthday} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Street Address">
              <input type="text" name="streetAddress" value={editForm.streetAddress} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Zip Code">
              <input type="text" name="zipCode" value={editForm.zipCode} onChange={onEditChange} maxLength={5} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
            </Field>
            <Field label="Account Status" required labelClassName="text-red-700">
              <select
                name="accountStatus"
                value={editForm.accountStatus}
                onChange={onEditChange}
                className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              <p className="mt-1 text-xs text-red-600">This directly controls whether the user account stays enabled.</p>
            </Field>
            <Field label="Borrow Status" required>
              <select name="borrowStatus" value={editForm.borrowStatus} onChange={onEditChange} className="w-full rounded-lg border border-gray-300 px-4 py-3">
                <option value="1">Good Standing</option>
                <option value="0">Restricted</option>
              </select>
            </Field>
          </div>

          <Banner message={editMessage} onDismiss={onDismissEditMessage} />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onResetEdit} className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">
              Reset Changes
            </button>
            <button type="button" onClick={onSave} disabled={saveLoading} className="rounded-lg bg-green-900 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50">
              {saveLoading ? "Saving..." : "Save User Changes"}
            </button>
          </div>
        </section>
      )}

      {isAdmin && !selectedIsUserAccount && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          This account is a staff account. You can view account history and activity here, but profile edits should be made from the Manage Staff page.
        </section>
      )}
    </div>
  );
}

function BorrowTable({ rows }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase text-gray-500">
          <th className="py-2 pr-4">Item</th>
          <th className="py-2 pr-4">Type</th>
          <th className="py-2 pr-4">Borrowed</th>
          <th className="py-2 pr-4">Due</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows?.map((borrow) => {
          const active = Number(borrow.Copy_status) === 2;
          const overdue = active && new Date(`${borrow.returnBy_date}T00:00:00`) < new Date();

          return (
            <tr key={borrow.BorrowedItem_ID} className="text-gray-700">
              <td className="py-2 pr-4 font-medium">{borrow.Item_name}</td>
              <td className="py-2 pr-4 text-gray-500">{borrow.Item_type}</td>
              <td className="py-2 pr-4">{formatDate(borrow.borrow_date)}</td>
              <td className="py-2 pr-4">{formatDate(borrow.returnBy_date)}</td>
              <td className="py-2">
                {active ? (
                  <StatusBadge label={overdue ? "Overdue" : "Checked Out"} color={overdue ? "red" : "yellow"} />
                ) : (
                  <StatusBadge label="Returned" color="green" />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function HoldTable({ rows }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase text-gray-500">
          <th className="py-2 pr-4">Item</th>
          <th className="py-2 pr-4">Type</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Queue</th>
          <th className="py-2 pr-4">Placed</th>
          <th className="py-2">Expires</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows?.map((hold) => (
          <tr key={hold.Hold_ID} className="text-gray-700">
            <td className="py-2 pr-4 font-medium">{hold.Item_name}</td>
            <td className="py-2 pr-4 text-gray-500">{hold.Item_type}</td>
            <td className="py-2 pr-4">
              <StatusBadge
                label={HOLD_STATUS[hold.hold_status] ?? "Unknown"}
                color={
                  Number(hold.hold_status) === 3
                    ? "green"
                    : Number(hold.hold_status) === 2
                      ? "blue"
                      : Number(hold.hold_status) === 1
                        ? "yellow"
                        : "red"
                }
              />
            </td>
            <td className="py-2 pr-4">#{Number(hold.queue_status) + 1}</td>
            <td className="py-2 pr-4">{formatDate(hold.hold_date)}</td>
            <td className="py-2">{formatDate(hold.expiry_date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeeTable({ rows }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase text-gray-500">
          <th className="py-2 pr-4">Item</th>
          <th className="py-2 pr-4">Type</th>
          <th className="py-2 pr-4">Fee Type</th>
          <th className="py-2 pr-4">Amount</th>
          <th className="py-2 pr-4">Date Owed</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows?.map((fee) => (
          <tr key={fee.Fine_ID} className="text-gray-700">
            <td className="py-2 pr-4 font-medium">{fee.Item_name}</td>
            <td className="py-2 pr-4 text-gray-500">{fee.Item_type}</td>
            <td className="py-2 pr-4">{formatFeeType(fee.fee_type)}</td>
            <td className="py-2 pr-4 font-semibold">${Number(fee.fee_amount).toFixed(2)}</td>
            <td className="py-2 pr-4">{formatDateTime(fee.date_owed)}</td>
            <td className="py-2">
              <StatusBadge
                label={FEE_STATUS[Number(fee.status)] ?? "Unknown"}
                color={Number(fee.status) === 1 ? "red" : "green"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReservationTable({ rows }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-xs uppercase text-gray-500">
          <th className="py-2 pr-4">Reservation ID</th>
          <th className="py-2 pr-4">Room</th>
          <th className="py-2 pr-4">Start</th>
          <th className="py-2 pr-4">Length</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows?.map((reservation) => (
          <tr key={reservation.Reservation_ID} className="text-gray-700">
            <td className="py-2 pr-4 font-medium">#{reservation.Reservation_ID}</td>
            <td className="py-2 pr-4">Room {reservation.Room_ID}</td>
            <td className="py-2 pr-4">{formatDateTime(reservation.start_time)}</td>
            <td className="py-2 pr-4">{formatDuration(reservation.length)}</td>
            <td className="py-2">
              <StatusBadge
                label={RESERVATION_STATUS[Number(reservation.reservation_status)] ?? "Unknown"}
                color={
                  Number(reservation.reservation_status) === 1
                    ? "green"
                    : Number(reservation.reservation_status) === 2
                      ? "blue"
                      : "red"
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
