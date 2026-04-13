/* eslint-disable react-refresh/only-export-components */
import {
  FEE_STATUS_OPTIONS,
  FEE_TYPE_OPTIONS,
  ITEM_TYPE_OPTIONS,
  ROLE_OPTIONS,
  ReportTable,
  SelectControl,
  appendPeriodParams,
  createDefaultPeriodFilters,
  formatDate,
  formatFeeStatus,
  formatFeeType,
  formatItemType,
  formatMoney,
  formatRole,
} from "./reportShared";

export const feesReportPage = {
  key: "revenue",
  label: "Revenue",
  pdfTitle: "Revenue Report",
  description: "Full fee history with revenue collected, backlog, and breakdown by type, item, or patron.",
  endpoint: "/api/reports/revenue",
  defaultSort: "date_owed",
  createInitialFilters() {
    return {
      ...createDefaultPeriodFilters(),
      role: "All",
      feeType: "All",
      itemType: "All",
      paidStatus: "All",
    };
  },
  buildParams(params, filters) {
    appendPeriodParams(params, filters);
    if (filters.role !== "All") params.set("role", filters.role);
    if (filters.feeType !== "All") params.set("feeType", filters.feeType);
    if (filters.itemType !== "All") params.set("itemType", filters.itemType);
    if (filters.paidStatus !== "All") params.set("paidStatus", filters.paidStatus);
  },
  getExportSummary(filters) {
    return [
      { label: "Role", value: ROLE_OPTIONS.find((o) => o.value === filters.role)?.label ?? "All" },
      { label: "Fee Type", value: FEE_TYPE_OPTIONS.find((o) => o.value === filters.feeType)?.label ?? "All" },
      { label: "Item Type", value: ITEM_TYPE_OPTIONS.find((o) => o.value === filters.itemType)?.label ?? "All" },
      { label: "Status", value: FEE_STATUS_OPTIONS.find((o) => o.value === filters.paidStatus)?.label ?? "All" },
    ];
  },
};

export function FeesReportsFilters({ filters, onChange }) {
  return (
    <>
      <SelectControl
        label="Fee Type"
        value={filters.feeType}
        onChange={(value) => onChange("feeType", value)}
        options={FEE_TYPE_OPTIONS}
      />
      <SelectControl
        label="Item Type"
        value={filters.itemType}
        onChange={(value) => onChange("itemType", value)}
        options={ITEM_TYPE_OPTIONS}
      />
      <SelectControl
        label="Role"
        value={filters.role}
        onChange={(value) => onChange("role", value)}
        options={ROLE_OPTIONS}
      />
      <SelectControl
        label="Status"
        value={filters.paidStatus}
        onChange={(value) => onChange("paidStatus", value)}
        options={FEE_STATUS_OPTIONS}
      />
    </>
  );
}

export function FeesReportsTable({
  data,
  periodLabel,
  sort,
  sortDirection,
  hiddenColumnKeys,
  onSortChange,
  onColumnVisibilityChange,
}) {
  const columns = getFeesColumns(periodLabel);

  return (
    <ReportTable
      reportType="revenue"
      sort={sort}
      sortDirection={sortDirection}
      data={data}
      columns={columns}
      hiddenColumnKeys={hiddenColumnKeys}
      onSortChange={onSortChange}
      onColumnVisibilityChange={onColumnVisibilityChange}
    />
  );
}

export function getFeesColumns(periodLabel) {
  return [
    {
      key: "borrower",
      label: "Borrower",
      sortable: false,
      hideable: false,
      width: 220,
      render: (item) => (
        <div className="min-w-[200px]">
          <div className="font-semibold text-green-900">
            {item.First_name} {item.Last_name}
          </div>
          <div className="text-xs text-gray-500">
            ID: {item.Person_ID} · {formatRole(item.role)}
          </div>
        </div>
      ),
      exportValue: (item) => `${item.First_name} ${item.Last_name} (ID: ${item.Person_ID})`,
    },
    {
      key: "Item_name",
      label: `Item (${periodLabel})`,
      width: 200,
      render: (item) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-gray-800">{item.Item_name}</div>
          <div className="text-xs text-gray-500">{formatItemType(item.Item_type)}</div>
        </div>
      ),
      exportValue: (item) => `${item.Item_name} (${formatItemType(item.Item_type)})`,
    },
    {
      key: "fee_type",
      label: "Fee Type",
      width: 110,
      render: (item) => formatFeeType(item.fee_type),
      exportValue: (item) => formatFeeType(item.fee_type),
    },
    {
      key: "fee_amount",
      label: "Amount",
      width: 110,
      render: (item) => formatMoney(item.fee_amount),
      exportValue: (item) => formatMoney(item.fee_amount),
    },
    {
      key: "fee_status",
      label: "Status",
      width: 100,
      render: (item) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            Number(item.fee_status) === 2
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-700"
          }`}
        >
          {formatFeeStatus(item.fee_status)}
        </span>
      ),
      exportValue: (item) => formatFeeStatus(item.fee_status),
    },
    {
      key: "date_owed",
      label: "Date Incurred",
      width: 130,
      render: (item) => formatDate(item.date_owed),
      exportValue: (item) => formatDate(item.date_owed),
    },
    {
      key: "Payment_Date",
      label: "Payment Date",
      width: 130,
      render: (item) => formatDate(item.Payment_Date),
      exportValue: (item) => formatDate(item.Payment_Date),
    },
  ];
}
