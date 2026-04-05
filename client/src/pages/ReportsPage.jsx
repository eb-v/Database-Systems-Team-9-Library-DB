import { Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";
import { getSessionRoleState } from "../auth";

const REPORT_META = {
  popularity: {
    description:
      "Identify high-demand titles, inventory pressure, and items that may need more copies.",
    endpoint: "/api/reports/popularity",
    defaultSort: "times_checked_out",
  },
  fees: {
    description:
      "Spot high-risk accounts by balance, fee count, and how long unpaid debt has been sitting.",
    endpoint: "/api/reports/fees",
    defaultSort: "unpaid_total",
  },
  patrons: {
    description:
      "Measure engagement, recency, and account risk across your patron base.",
    endpoint: "/api/reports/patrons",
    defaultSort: "borrow_count",
  },
};

const REPORT_OPTIONS = [
  { label: "Popularity", value: "popularity" },
  { label: "Unpaid Fees", value: "fees" },
  { label: "Patron Activity", value: "patrons" },
];

const CURRENT_YEAR = new Date().getFullYear();

const PERIOD_TYPE_OPTIONS = [
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
  { label: "All Time", value: "all" },
];

const MONTH_OPTIONS = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const QUARTER_OPTIONS = [
  { label: "Quarter 1 (Jan-Mar)", value: "1" },
  { label: "Quarter 2 (Apr-Jun)", value: "2" },
  { label: "Quarter 3 (Jul-Sep)", value: "3" },
  { label: "Quarter 4 (Oct-Dec)", value: "4" },
];

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => {
  const year = CURRENT_YEAR - index;
  return { label: String(year), value: String(year) };
});

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

const DEFAULT_PERIOD_TYPE = "quarter";

function createInitialSortState() {
  return {
    popularity: REPORT_META.popularity.defaultSort,
    fees: REPORT_META.fees.defaultSort,
    patrons: REPORT_META.patrons.defaultSort,
  };
}

function createInitialSortDirectionState() {
  return {
    popularity: "desc",
    fees: "desc",
    patrons: "desc",
  };
}

function createInitialFilterState() {
  return {
    popularity: {
      itemType: "All",
      ...createDefaultPeriodFilters(),
    },
    fees: {
      ...createDefaultPeriodFilters(),
      role: "All",
      minTotal: "",
      minFeeCount: "",
      minDaysOutstanding: "",
    },
    patrons: {
      ...createDefaultPeriodFilters(),
      role: "All",
      minBorrows: "",
      withUnpaidOnly: false,
    },
  };
}

export default function ReportsPage() {
  const { isAdmin } = getSessionRoleState();
  const token = sessionStorage.getItem("token");

  const [reportType, setReportType] = useState("popularity");
  const [sortByReport, setSortByReport] = useState(createInitialSortState);
  const [sortDirectionByReport, setSortDirectionByReport] = useState(
    createInitialSortDirectionState
  );
  const [filtersByReport, setFiltersByReport] = useState(createInitialFilterState);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reportMeta = REPORT_META[reportType];
  const currentSort = sortByReport[reportType];
  const currentSortDirection = sortDirectionByReport[reportType];
  const currentFilters = filtersByReport[reportType];
  const reportPeriodLabel = getPeriodSelectionLabel(
    currentFilters.periodType,
    currentFilters.periodValue
  );

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

        const params = buildReportParams(
          reportType,
          currentSort,
          currentSortDirection,
          currentFilters
        );
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
  }, [
    token,
    reportType,
    currentSort,
    currentSortDirection,
    currentFilters,
    reportMeta.endpoint,
  ]);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  function updateCurrentSort(value) {
    setSortByReport((prev) => ({
      ...prev,
      [reportType]: value,
    }));
  }

  function updateCurrentSortDirection(value) {
    setSortDirectionByReport((prev) => ({
      ...prev,
      [reportType]: value,
    }));
  }

  function handleColumnSort(columnKey) {
    const nextDirection =
      currentSort === columnKey && currentSortDirection === "desc" ? "asc" : "desc";

    updateCurrentSort(columnKey);
    updateCurrentSortDirection(nextDirection);
  }

  function updateCurrentFilter(key, value) {
    if (key === "periodType") {
      setFiltersByReport((prev) => ({
        ...prev,
        [reportType]: {
          ...prev[reportType],
          periodType: value,
          periodValue:
            prev[reportType].periodType === value
              ? prev[reportType].periodValue
              : getDefaultPeriodValue(value),
        },
      }));
      return;
    }

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

        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <SelectControl
              label="Report"
              value={reportType}
              onChange={setReportType}
              options={REPORT_OPTIONS}
            />

            <PeriodPickerControl
              periodType={currentFilters.periodType}
              periodValue={currentFilters.periodValue}
              onPeriodTypeChange={(value) => updateCurrentFilter("periodType", value)}
              onPeriodValueChange={(value) => updateCurrentFilter("periodValue", value)}
            />

            <ReportFilters
              reportType={reportType}
              filters={currentFilters}
              onChange={updateCurrentFilter}
            />
          </div>
        </div>

        {loading && <InfoBox text="Loading..." />}
        {error && <InfoBox text={error} error />}
        {!loading && !error && data.length === 0 && <InfoBox text="No data found." />}

        {!loading && !error && data.length > 0 && (
          <ReportTable
            reportType={reportType}
            sort={currentSort}
            sortDirection={currentSortDirection}
            data={data}
            periodLabel={reportPeriodLabel}
            onSortChange={handleColumnSort}
          />
        )}
      </div>
    </div>
  );
}

function buildReportParams(reportType, sort, sortDirection, filters) {
  const params = new URLSearchParams();

  if (sort) {
    params.set("sort", sort);
  }

  if (sortDirection) {
    params.set("direction", sortDirection);
  }

  appendPeriodParams(params, filters);

  switch (reportType) {
    case "popularity":
      if (filters.itemType !== "All") params.set("type", filters.itemType);
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
        <SelectControl
          label="Item Type"
          value={filters.itemType}
          onChange={(value) => onChange("itemType", value)}
          options={ITEM_TYPE_OPTIONS}
        />
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
            label="Min Borrows in Period"
            type="number"
            min={0}
            value={filters.minBorrows}
            onChange={(value) => onChange("minBorrows", value)}
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
        className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
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
        className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
        {...rest}
      />
    </div>
  );
}

function PeriodPickerControl({
  periodType,
  periodValue,
  onPeriodTypeChange,
  onPeriodValueChange,
}) {
  const controlRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!controlRef.current?.contains(event.target)) {
        setActivePanel(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function handleTypeSelect(nextType) {
    onPeriodTypeChange(nextType);

    if (nextType === "all") {
      setActivePanel(null);
      return;
    }

    setActivePanel("value");
  }

  function handleValueSelect(nextValue) {
    onPeriodValueChange(nextValue);
    setActivePanel(null);
  }

  return (
    <div ref={controlRef} className="relative xl:col-span-2">
      <label className="block text-sm text-gray-600 mb-1">Time Period</label>
      <button
        type="button"
        onClick={() => setActivePanel((prev) => (prev ? null : "type"))}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {getPeriodTriggerLabel(periodType, periodValue)}
          </div>
          <div className="text-xs text-gray-500">
            {getPeriodPromptLabel(periodType)}
          </div>
        </div>
        <span className="ml-3 text-xs text-gray-500">{activePanel ? "Close" : "Choose"}</span>
      </button>

      {activePanel === "type" && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            {PERIOD_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTypeSelect(option.value)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  periodType === option.value
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePanel === "value" && periodType !== "all" && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          {periodType === "month" && (
            <MonthPickerPanel periodValue={periodValue} onSelect={handleValueSelect} />
          )}
          {periodType === "quarter" && (
            <QuarterPickerPanel periodValue={periodValue} onSelect={handleValueSelect} />
          )}
          {periodType === "year" && (
            <YearPickerPanel periodValue={periodValue} onSelect={handleValueSelect} />
          )}
        </div>
      )}
    </div>
  );
}

function MonthPickerPanel({ periodValue, onSelect }) {
  return (
    <div>
      <div className="mb-3 text-center text-sm font-semibold text-gray-700">
        {CURRENT_YEAR}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTH_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-md px-3 py-2 text-sm ${
              periodValue === option.value
                ? "bg-green-700 text-white"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {option.label.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuarterPickerPanel({ periodValue, onSelect }) {
  return (
    <div>
      <div className="mb-3 text-center text-sm font-semibold text-gray-700">
        {CURRENT_YEAR}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {QUARTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-md border px-3 py-3 text-left text-sm ${
              periodValue === option.value
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="font-semibold">Q{option.value}</div>
            <div className="mt-1 text-xs text-gray-500">{getQuarterSubtitle(option.label)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function YearPickerPanel({ periodValue, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {YEAR_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={`rounded-md px-3 py-2 text-sm ${
            periodValue === option.value
              ? "bg-green-700 text-white"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CheckboxControl({ label, checked, onChange }) {
  return (
    <label className="flex h-full min-h-[42px] items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 xl:self-end">
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

function ReportTable({
  reportType,
  sort,
  sortDirection,
  data,
  periodLabel = "All Time",
  onSortChange,
}) {
  const columns = getReportColumns(reportType, periodLabel);
  const {
    topScrollRef,
    bottomScrollRef,
    topSpacerRef,
    handleTopScroll,
    handleBottomScroll,
  } = useSyncedHorizontalScroll([reportType, data.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto border-b border-gray-200 bg-gray-50"
      >
        <div ref={topSpacerRef} className="h-4" />
      </div>
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className="overflow-x-auto"
      >
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((column) => {
                const isSortedColumn = column.key === sort;

                return (
                  <th
                    key={column.key}
                    className={`border border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${
                      isSortedColumn ? "bg-green-100 text-green-900" : "text-gray-600"
                    }`}
                  >
                    {column.sortable === false ? (
                      column.label
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="flex w-full items-start justify-between gap-2 text-left"
                      >
                        <span>{column.label}</span>
                        <span
                          className={`mt-0.5 text-sm ${
                            isSortedColumn ? "text-green-900" : "text-gray-400"
                          }`}
                        >
                          {getSortIndicator(isSortedColumn, sortDirection)}
                        </span>
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={getRowKey(reportType, row, index)}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border border-gray-200 px-3 py-2 align-top ${
                      column.key === sort ? "bg-green-50" : ""
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getReportColumns(reportType, periodLabel) {
  switch (reportType) {
    case "fees":
      return getFeeColumns(periodLabel);
    case "patrons":
      return getPatronColumns(periodLabel);
    default:
      return getPopularityColumns(periodLabel);
  }
}

function getPopularityColumns(periodLabel) {
  return [
    {
      key: "item_name",
      label: "Item",
      sortable: false,
      render: (item) => renderPopularityIdentityCell(item),
    },
    {
      key: "times_checked_out",
      label: `Checkouts (${periodLabel})`,
      render: (item) => formatNumber(item.times_checked_out),
    },
    {
      key: "borrowing_rate",
      label: `Borrow Rate (${periodLabel})`,
      render: (item) => formatDecimal(item.borrowing_rate),
    },
    {
      key: "utilization_rate",
      label: `Utilization (${periodLabel})`,
      render: (item) => formatPercent(item.utilization_rate),
    },
    {
      key: "demand_ratio",
      label: `Demand Ratio (${periodLabel})`,
      render: (item) => formatDecimal(item.demand_ratio),
    },
    {
      key: "active_holds",
      label: `Holds (${periodLabel})`,
      render: (item) => formatNumber(item.active_holds),
    },
    {
      key: "unique_borrowers",
      label: `Unique Borrowers (${periodLabel})`,
      render: (item) => formatNumber(item.unique_borrowers),
    },
    {
      key: "num_copies",
      label: "Copies Owned",
      render: (item) => formatNumber(item.num_copies),
    },
    {
      key: "available_copies",
      label: "Available Now",
      render: (item) => formatNumber(item.available_copies),
    },
    {
      key: "checked_out_copies",
      label: "Checked Out Now",
      render: (item) => formatNumber(item.checked_out_copies),
    },
    {
      key: "last_borrow_date",
      label: `Last Borrowed (${periodLabel})`,
      render: (item) => formatDate(item.last_borrow_date),
    },
    {
      key: "recommended_additional_copies",
      label: "Stock Recommendation",
      render: (item) => <RecommendationCell item={item} />,
    },
  ];
}

function getFeeColumns(periodLabel) {
  return [
    {
      key: "patron",
      label: "Patron",
      sortable: false,
      render: (item) =>
        renderIdentityCell(
          `${item.First_name} ${item.Last_name}`,
          `Patron ID: ${item.Person_ID}`
        ),
    },
    { key: "role", label: "Role", render: (item) => formatRole(item.role) },
    {
      key: "unpaid_total",
      label: `Unpaid Total (${periodLabel})`,
      render: (item) => formatMoney(item.unpaid_total),
    },
    {
      key: "unpaid_fee_count",
      label: `Unpaid Fees (${periodLabel})`,
      render: (item) => formatNumber(item.unpaid_fee_count),
    },
    {
      key: "overdue_item_count",
      label: `Affected Items (${periodLabel})`,
      render: (item) => formatNumber(item.overdue_item_count),
    },
    {
      key: "avg_fee_amount",
      label: `Avg Fee (${periodLabel})`,
      render: (item) => formatMoney(item.avg_fee_amount),
    },
    {
      key: "largest_fee_amount",
      label: `Largest Fee (${periodLabel})`,
      render: (item) => formatMoney(item.largest_fee_amount),
    },
    {
      key: "max_days_outstanding",
      label: `Oldest Debt Age (${periodLabel})`,
      render: (item) => `${formatNumber(item.max_days_outstanding)} days`,
    },
    {
      key: "avg_days_outstanding",
      label: `Avg Debt Age (${periodLabel})`,
      render: (item) => `${formatDecimal(item.avg_days_outstanding)} days`,
    },
    {
      key: "oldest_unpaid_date",
      label: `Oldest Debt Date (${periodLabel})`,
      render: (item) => formatDate(item.oldest_unpaid_date),
    },
  ];
}

function getPatronColumns(periodLabel) {
  return [
    {
      key: "patron",
      label: "Patron",
      sortable: false,
      render: (item) =>
        renderIdentityCell(
          `${item.First_name} ${item.Last_name}`,
          `Patron ID: ${item.Person_ID}`
        ),
    },
    { key: "role", label: "Role", render: (item) => formatRole(item.role) },
    {
      key: "account_status",
      label: "Account Status",
      render: (item) => (Number(item.account_status) === 1 ? "Active" : "Inactive"),
    },
    {
      key: "borrow_status",
      label: "Borrow Status",
      render: (item) => (Number(item.borrow_status) === 1 ? "Good Standing" : "Restricted"),
    },
    {
      key: "borrow_count",
      label: `Borrows (${periodLabel})`,
      render: (item) => formatNumber(item.borrow_count),
    },
    {
      key: "borrow_rate",
      label: `Borrow Rate (${periodLabel})`,
      render: (item) => formatDecimal(item.borrow_rate),
    },
    {
      key: "unique_titles_borrowed",
      label: `Unique Titles (${periodLabel})`,
      render: (item) => formatNumber(item.unique_titles_borrowed),
    },
    {
      key: "active_holds",
      label: `Active Holds (${periodLabel})`,
      render: (item) => formatNumber(item.active_holds),
    },
    {
      key: "unpaid_total",
      label: `Unpaid Total (${periodLabel})`,
      render: (item) => formatMoney(item.unpaid_total),
    },
    {
      key: "unpaid_fee_count",
      label: `Unpaid Fees (${periodLabel})`,
      render: (item) => formatNumber(item.unpaid_fee_count),
    },
    {
      key: "patrons_months",
      label: "Patron Months",
      render: (item) => formatNumber(item.patrons_months),
    },
    {
      key: "days_since_last_borrow",
      label: `Days Since Last Borrow (${periodLabel})`,
      render: (item) =>
        item.days_since_last_borrow == null
          ? "Never"
          : `${formatNumber(item.days_since_last_borrow)} days`,
    },
    {
      key: "last_borrow_date",
      label: `Last Borrowed (${periodLabel})`,
      render: (item) => formatDate(item.last_borrow_date),
    },
  ];
}

function RecommendationCell({ item }) {
  return (
    <div
      className={`min-w-[180px] rounded-md border px-3 py-2 ${
        item.recommendation_tone === "warn"
          ? "border-amber-300 bg-amber-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <div
        className={`font-semibold ${
          item.recommendation_tone === "warn" ? "text-amber-900" : "text-green-900"
        }`}
      >
        {item.recommendation_summary}
      </div>
      <div className="mt-1 text-xs text-gray-600">{item.recommendation_detail}</div>
    </div>
  );
}

function getDefaultPeriodValue(periodType) {
  if (periodType === "month") {
    return String(new Date().getMonth() + 1);
  }

  if (periodType === "quarter") {
    return String(Math.floor(new Date().getMonth() / 3) + 1);
  }

  if (periodType === "year") {
    return String(CURRENT_YEAR);
  }

  return "";
}

function createDefaultPeriodFilters() {
  return {
    periodType: DEFAULT_PERIOD_TYPE,
    periodValue: getDefaultPeriodValue(DEFAULT_PERIOD_TYPE),
  };
}

function appendPeriodParams(params, filters) {
  params.set("periodType", filters.periodType || "all");

  if (filters.periodType !== "all" && filters.periodValue) {
    params.set("periodValue", filters.periodValue);
  }
}

function getPeriodSelectionLabel(periodType, periodValue) {
  if (periodType === "month") {
    const selectedMonth = MONTH_OPTIONS.find((option) => option.value === periodValue);
    return selectedMonth ? `${selectedMonth.label} ${CURRENT_YEAR}` : `Month ${CURRENT_YEAR}`;
  }

  if (periodType === "quarter") {
    return `Q${periodValue} ${CURRENT_YEAR}`;
  }

  if (periodType === "year") {
    return periodValue || String(CURRENT_YEAR);
  }

  return "All Time";
}

function getPeriodTriggerLabel(periodType, periodValue) {
  if (periodType === "all") {
    return "All Time";
  }

  const typeLabel =
    PERIOD_TYPE_OPTIONS.find((option) => option.value === periodType)?.label ?? "Time Period";

  return `${typeLabel}: ${getPeriodSelectionLabel(periodType, periodValue)}`;
}

function getPeriodPromptLabel(periodType) {
  if (periodType === "month") {
    return "Pick a month";
  }

  if (periodType === "quarter") {
    return "Pick a quarter";
  }

  if (periodType === "year") {
    return "Pick a year";
  }

  return "Using the full borrowing history";
}

function getQuarterSubtitle(label) {
  const match = label.match(/\((.*)\)/);
  return match ? match[1] : label;
}

function useSyncedHorizontalScroll(deps) {
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const topSpacerRef = useRef(null);

  useEffect(() => {
    function syncScrollWidth() {
      if (!bottomScrollRef.current || !topSpacerRef.current) {
        return;
      }

      const table = bottomScrollRef.current.querySelector("table");
      topSpacerRef.current.style.width = table ? `${table.scrollWidth}px` : "100%";
    }

    syncScrollWidth();
    window.addEventListener("resize", syncScrollWidth);

    return () => {
      window.removeEventListener("resize", syncScrollWidth);
    };
  }, deps);

  function syncPartnerScroll(sourceRef, targetRef) {
    if (!sourceRef.current || !targetRef.current) {
      return;
    }

    if (targetRef.current.scrollLeft !== sourceRef.current.scrollLeft) {
      targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
    }
  }

  function handleTopScroll() {
    syncPartnerScroll(topScrollRef, bottomScrollRef);
  }

  function handleBottomScroll() {
    syncPartnerScroll(bottomScrollRef, topScrollRef);
  }

  return {
    topScrollRef,
    bottomScrollRef,
    topSpacerRef,
    handleTopScroll,
    handleBottomScroll,
  };
}

function renderIdentityCell(title, subtitle) {
  return (
    <div className="min-w-[220px]">
      <div className="font-semibold text-green-900">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function renderPopularityIdentityCell(item) {
  const authorName =
    [item.author_firstName, item.author_lastName].filter(Boolean).join(" ") || "N/A";
  const details = [
    formatItemType(item.Item_type),
    item.genre || "N/A",
    authorName,
  ];

  return (
    <div className="min-w-[240px]">
      <div className="font-semibold text-green-900">{item.Item_name}</div>
      <div className="text-sm text-green-800">{details.join(" | ")}</div>
    </div>
  );
}

function getRowKey(reportType, row, index) {
  if (reportType === "popularity") {
    return row.Item_ID ?? index;
  }

  if (reportType === "fees") {
    return `fee-${row.Person_ID ?? index}`;
  }

  return `patron-${row.Person_ID ?? index}`;
}

function getSortIndicator(isSortedColumn, sortDirection) {
  if (!isSortedColumn) {
    return "\u2195";
  }

  return sortDirection === "asc" ? "\u2191" : "\u2193";
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
