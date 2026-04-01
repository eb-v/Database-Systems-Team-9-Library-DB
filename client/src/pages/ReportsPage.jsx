import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";
import { getSessionRoleState } from "../auth";

const REPORT_META = {
  popularity: {
    title: "Popularity Report",
    description:
      "Identify high-demand titles, inventory pressure, and items that may need more copies.",
    endpoint: "/api/reports/popularity",
    defaultSort: "times_checked_out",
  },
  fees: {
    title: "Unpaid Fees Report",
    description:
      "Spot high-risk accounts by balance, fee count, and how long unpaid debt has been sitting.",
    endpoint: "/api/reports/fees",
    defaultSort: "unpaid_total",
  },
  patrons: {
    title: "Patron Activity Report",
    description:
      "Measure engagement, recency, and account risk across your patron base.",
    endpoint: "/api/reports/patrons",
    defaultSort: "recent_borrows",
  },
};

const SORT_OPTIONS = {
  popularity: [
    { label: "Total Checkouts", value: "times_checked_out" },
    { label: "Active Holds", value: "active_holds" },
    { label: "Demand Ratio", value: "demand_ratio" },
    { label: "Borrowing Rate", value: "borrowing_rate" },
    { label: "Utilization %", value: "utilization_rate" },
  ],
  fees: [
    { label: "Total Owed", value: "unpaid_total" },
    { label: "Fee Count", value: "unpaid_fee_count" },
    { label: "Overdue Items", value: "overdue_item_count" },
    { label: "Average Fee", value: "avg_fee_amount" },
    { label: "Oldest Debt Age", value: "max_days_outstanding" },
  ],
  patrons: [
    { label: "Recent Borrows (90d)", value: "recent_borrows" },
    { label: "Borrow Rate", value: "lifetime_borrow_rate" },
    { label: "Lifetime Borrows", value: "lifetime_borrows" },
    { label: "Unique Titles", value: "unique_titles_borrowed" },
    { label: "Active Holds", value: "active_holds" },
    { label: "Unpaid Total", value: "unpaid_total" },
  ],
};

const ROLE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Patrons", value: "2" },
  { label: "Staff", value: "1" },
];

const ITEM_TYPE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Books", value: "1" },
  { label: "CDs", value: "2" },
  { label: "Devices", value: "3" },
];

function createInitialSortState() {
  return {
    popularity: REPORT_META.popularity.defaultSort,
    fees: REPORT_META.fees.defaultSort,
    patrons: REPORT_META.patrons.defaultSort,
  };
}

function createInitialFilterState() {
  return {
    popularity: {
      itemType: "All",
      genre: "",
      from: "",
      to: "",
      minCheckouts: "",
      minHolds: "",
    },
    fees: {
      role: "All",
      minTotal: "",
      minFeeCount: "",
      minDaysOutstanding: "",
    },
    patrons: {
      role: "All",
      minBorrows: "",
      activeWithinDays: "",
      withUnpaidOnly: false,
    },
  };
}

export default function ReportsPage() {
  const { isAdmin } = getSessionRoleState();
  const token = sessionStorage.getItem("token");

  const [reportType, setReportType] = useState("popularity");
  const [sortByReport, setSortByReport] = useState(createInitialSortState);
  const [filtersByReport, setFiltersByReport] = useState(createInitialFilterState);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reportMeta = REPORT_META[reportType];
  const currentSort = sortByReport[reportType];
  const currentFilters = filtersByReport[reportType];

  useEffect(() => {
    if (!token) {
      setError("Not logged in.");
      setLoading(false);
      return;
    }

    async function fetchReport() {
      try {
        setLoading(true);
        setError("");

        const params = buildReportParams(reportType, currentSort, currentFilters);
        const query = params.toString();
        const url = `${reportMeta.endpoint}${query ? `?${query}` : ""}`;

        const response = await apiFetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || "Failed to load report");
        }

        setData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Failed to fetch report:", err);
        setError(err.message || "Failed to load report");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [token, reportType, currentSort, currentFilters, reportMeta.endpoint]);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  function updateCurrentSort(value) {
    setSortByReport((prev) => ({
      ...prev,
      [reportType]: value,
    }));
  }

  function updateCurrentFilter(key, value) {
    setFiltersByReport((prev) => ({
      ...prev,
      [reportType]: {
        ...prev[reportType],
        [key]: value,
      },
    }));
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">Reports</h1>
        <p className="text-gray-600 mb-6">{reportMeta.description}</p>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4">
          <SelectControl
            label="Report"
            value={reportType}
            onChange={setReportType}
            options={[
              { label: "Popularity", value: "popularity" },
              { label: "Unpaid Fees", value: "fees" },
              { label: "Patron Activity", value: "patrons" },
            ]}
          />

          <SelectControl
            label="Sort"
            value={currentSort}
            onChange={updateCurrentSort}
            options={SORT_OPTIONS[reportType]}
          />

          <ReportFilters
            reportType={reportType}
            filters={currentFilters}
            onChange={updateCurrentFilter}
          />
        </div>

        {loading && <InfoBox text="Loading..." />}
        {error && <InfoBox text={error} error />}
        {!loading && !error && data.length === 0 && <InfoBox text="No data found." />}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-4">
            {data.map((item, index) => (
              <ReportRow
                key={item.Item_ID || item.Person_ID || index}
                reportType={reportType}
                sort={currentSort}
                item={item}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildReportParams(reportType, sort, filters) {
  const params = new URLSearchParams();

  if (sort) {
    params.set("sort", sort);
  }

  switch (reportType) {
    case "popularity":
      if (filters.itemType !== "All") params.set("type", filters.itemType);
      if (filters.genre.trim()) params.set("genre", filters.genre.trim());
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.minCheckouts !== "") params.set("minCheckouts", filters.minCheckouts);
      if (filters.minHolds !== "") params.set("minHolds", filters.minHolds);
      break;
    case "fees":
      if (filters.role !== "All") params.set("role", filters.role);
      if (filters.minTotal !== "") params.set("minTotal", filters.minTotal);
      if (filters.minFeeCount !== "") params.set("minFeeCount", filters.minFeeCount);
      if (filters.minDaysOutstanding !== "") {
        params.set("minDaysOutstanding", filters.minDaysOutstanding);
      }
      break;
    case "patrons":
      if (filters.role !== "All") params.set("role", filters.role);
      if (filters.minBorrows !== "") params.set("minBorrows", filters.minBorrows);
      if (filters.activeWithinDays !== "") {
        params.set("activeWithinDays", filters.activeWithinDays);
      }
      if (filters.withUnpaidOnly) params.set("withUnpaidOnly", "true");
      break;
    default:
      break;
  }

  return params;
}

function ReportFilters({ reportType, filters, onChange }) {
  switch (reportType) {
    case "popularity":
      return (
        <>
          <SelectControl
            label="Type"
            value={filters.itemType}
            onChange={(value) => onChange("itemType", value)}
            options={ITEM_TYPE_OPTIONS}
          />
          <InputControl
            label="Genre"
            value={filters.genre}
            onChange={(value) => onChange("genre", value)}
            placeholder="e.g. Fiction"
          />
          <InputControl
            label="Borrowed From"
            type="date"
            value={filters.from}
            onChange={(value) => onChange("from", value)}
          />
          <InputControl
            label="Borrowed To"
            type="date"
            value={filters.to}
            onChange={(value) => onChange("to", value)}
          />
          <InputControl
            label="Min Checkouts"
            type="number"
            min={0}
            value={filters.minCheckouts}
            onChange={(value) => onChange("minCheckouts", value)}
          />
          <InputControl
            label="Min Active Holds"
            type="number"
            min={0}
            value={filters.minHolds}
            onChange={(value) => onChange("minHolds", value)}
          />
        </>
      );
    case "fees":
      return (
        <>
          <SelectControl
            label="Patron Type"
            value={filters.role}
            onChange={(value) => onChange("role", value)}
            options={ROLE_OPTIONS}
          />
          <InputControl
            label="Min Balance"
            type="number"
            min={0}
            step="0.01"
            value={filters.minTotal}
            onChange={(value) => onChange("minTotal", value)}
          />
          <InputControl
            label="Min Fee Count"
            type="number"
            min={0}
            value={filters.minFeeCount}
            onChange={(value) => onChange("minFeeCount", value)}
          />
          <InputControl
            label="Min Debt Age (Days)"
            type="number"
            min={0}
            value={filters.minDaysOutstanding}
            onChange={(value) => onChange("minDaysOutstanding", value)}
          />
        </>
      );
    case "patrons":
      return (
        <>
          <SelectControl
            label="Patron Type"
            value={filters.role}
            onChange={(value) => onChange("role", value)}
            options={ROLE_OPTIONS}
          />
          <InputControl
            label="Min Lifetime Borrows"
            type="number"
            min={0}
            value={filters.minBorrows}
            onChange={(value) => onChange("minBorrows", value)}
          />
          <InputControl
            label="Borrowed Within (Days)"
            type="number"
            min={0}
            value={filters.activeWithinDays}
            onChange={(value) => onChange("activeWithinDays", value)}
          />
          <CheckboxControl
            label="Only Show Accounts With Debt"
            checked={filters.withUnpaidOnly}
            onChange={(value) => onChange("withUnpaidOnly", value)}
          />
        </>
      );
    default:
      return null;
  }
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputControl({ label, value, onChange, type = "text", ...rest }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2"
        {...rest}
      />
    </div>
  );
}

function CheckboxControl({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 mt-6">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function InfoBox({ text, error = false }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-md p-5 ${
        error ? "text-red-600" : "text-gray-600"
      }`}
    >
      {text}
    </div>
  );
}

function ReportRow({ reportType, item, sort }) {
  if (reportType === "fees") {
    return <FeeRow item={item} sort={sort} />;
  }

  if (reportType === "patrons") {
    return <PatronRow item={item} sort={sort} />;
  }

  return <PopularityRow item={item} sort={sort} />;
}

function RowShell({ title, subtitle, featured, fields }) {
  return (
    <div className="bg-white rounded-xl shadow-md px-4 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 xl:w-64 xl:shrink-0">
          <h3 className="text-lg font-semibold text-green-900 break-words">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1 break-words">{subtitle}</p>}
        </div>

        {featured && (
          <div className="shrink-0 rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 min-w-[180px]">
            <p className="text-[11px] uppercase tracking-wide text-gray-600">Sorted By</p>
            <p className="text-sm font-bold text-gray-900">{featured.label}</p>
            <p className="text-lg font-bold text-green-900 break-words">{featured.value}</p>
          </div>
        )}

        <div className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">{field.label}</p>
              <p className="font-semibold break-words">{field.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getFeaturedField(fields, sort) {
  return fields.find((field) => field.key === sort) || null;
}

function getOtherFields(fields, sort) {
  return fields.filter((field) => field.key !== sort);
}

function PopularityRow({ item, sort }) {
  const fields = [
    { key: "times_checked_out", label: "Checkouts", value: formatNumber(item.times_checked_out) },
    { key: "active_holds", label: "Active Holds", value: formatNumber(item.active_holds) },
    { key: "demand_ratio", label: "Demand Ratio", value: formatDecimal(item.demand_ratio) },
    { key: "borrowing_rate", label: "Borrowing Rate", value: formatDecimal(item.borrowing_rate) },
    { key: "utilization_rate", label: "Utilization", value: formatPercent(item.utilization_rate) },
    { key: "unique_borrowers", label: "Unique Borrowers", value: formatNumber(item.unique_borrowers) },
    { key: "genre", label: "Genre", value: item.genre || "N/A" },
    { key: "num_copies", label: "Copies", value: formatNumber(item.num_copies) },
    { key: "available_copies", label: "Available", value: formatNumber(item.available_copies) },
    { key: "last_borrow_date", label: "Last Borrowed", value: formatDate(item.last_borrow_date) },
  ];

  return (
    <RowShell
      title={item.Item_name}
      subtitle={getItemSubtitle(item)}
      featured={getFeaturedField(fields, sort)}
      fields={getOtherFields(fields, sort)}
    />
  );
}

function FeeRow({ item, sort }) {
  const fields = [
    { key: "unpaid_total", label: "Unpaid Total", value: formatMoney(item.unpaid_total) },
    { key: "unpaid_fee_count", label: "Unpaid Fees", value: formatNumber(item.unpaid_fee_count) },
    { key: "overdue_item_count", label: "Affected Items", value: formatNumber(item.overdue_item_count) },
    { key: "avg_fee_amount", label: "Avg Fee", value: formatMoney(item.avg_fee_amount) },
    { key: "largest_fee_amount", label: "Largest Fee", value: formatMoney(item.largest_fee_amount) },
    {
      key: "max_days_outstanding",
      label: "Oldest Debt Age",
      value: `${formatNumber(item.max_days_outstanding)} days`,
    },
    {
      key: "avg_days_outstanding",
      label: "Avg Debt Age",
      value: `${formatDecimal(item.avg_days_outstanding)} days`,
    },
    {
      key: "oldest_unpaid_date",
      label: "Oldest Debt Date",
      value: formatDate(item.oldest_unpaid_date),
    },
    { key: "role", label: "Role", value: formatRole(item.role) },
  ];

  return (
    <RowShell
      title={`${item.First_name} ${item.Last_name}`}
      subtitle={`Patron ID: ${item.Person_ID}`}
      featured={getFeaturedField(fields, sort)}
      fields={getOtherFields(fields, sort)}
    />
  );
}

function PatronRow({ item, sort }) {
  const fields = [
    { key: "recent_borrows", label: "Recent Borrows (90d)", value: formatNumber(item.recent_borrows) },
    { key: "lifetime_borrow_rate", label: "Borrow Rate", value: formatDecimal(item.lifetime_borrow_rate) },
    { key: "lifetime_borrows", label: "Lifetime Borrows", value: formatNumber(item.lifetime_borrows) },
    {
      key: "unique_titles_borrowed",
      label: "Unique Titles",
      value: formatNumber(item.unique_titles_borrowed),
    },
    { key: "active_holds", label: "Active Holds", value: formatNumber(item.active_holds) },
    { key: "unpaid_total", label: "Unpaid Total", value: formatMoney(item.unpaid_total) },
    { key: "unpaid_fee_count", label: "Unpaid Fees", value: formatNumber(item.unpaid_fee_count) },
    { key: "patrons_months", label: "Patron Months", value: formatNumber(item.patrons_months) },
    {
      key: "days_since_last_borrow",
      label: "Days Since Last Borrow",
      value:
        item.days_since_last_borrow == null
          ? "Never"
          : `${formatNumber(item.days_since_last_borrow)} days`,
    },
    { key: "role", label: "Role", value: formatRole(item.role) },
    {
      key: "account_status",
      label: "Account Status",
      value: Number(item.account_status) === 1 ? "Active" : "Inactive",
    },
    {
      key: "borrow_status",
      label: "Borrow Status",
      value: Number(item.borrow_status) === 1 ? "Good Standing" : "Restricted",
    },
  ];

  return (
    <RowShell
      title={`${item.First_name} ${item.Last_name}`}
      subtitle={`Patron ID: ${item.Person_ID} | Last Borrow: ${formatDate(item.last_borrow_date)}`}
      featured={getFeaturedField(fields, sort)}
      fields={getOtherFields(fields, sort)}
    />
  );
}

function getItemSubtitle(item) {
  const itemType = formatItemType(item.Item_type);
  const authorName = [item.author_firstName, item.author_lastName].filter(Boolean).join(" ");

  if (authorName) {
    return `Item ID: ${item.Item_ID} | ${itemType} | ${authorName}`;
  }

  return `Item ID: ${item.Item_ID} | ${itemType}`;
}

function formatItemType(type) {
  if (Number(type) === 1) return "Book";
  if (Number(type) === 2) return "CD";
  if (Number(type) === 3) return "Device";
  return "Item";
}

function formatRole(role) {
  return Number(role) === 1 ? "Staff" : "Patron";
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

function formatDecimal(value) {
  return Number(value ?? 0).toFixed(2);
}

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function formatMoney(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  const stringValue = String(value);
  return stringValue.length >= 10 ? stringValue.slice(0, 10) : stringValue;
}
