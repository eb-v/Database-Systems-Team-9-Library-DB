/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";

export const CURRENT_YEAR = new Date().getFullYear();

export const PERIOD_TYPE_OPTIONS = [
  { label: "Custom Date", value: "custom" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
  { label: "All Time", value: "all" },
];

export const MONTH_OPTIONS = [
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

export const QUARTER_OPTIONS = [
  { label: "Quarter 1 (Jan-Mar)", value: "1" },
  { label: "Quarter 2 (Apr-Jun)", value: "2" },
  { label: "Quarter 3 (Jul-Sep)", value: "3" },
  { label: "Quarter 4 (Oct-Dec)", value: "4" },
];

export const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => {
  const year = CURRENT_YEAR - index;
  return { label: String(year), value: String(year) };
});

export const ROLE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Patrons", value: "2" },
  { label: "Staff", value: "1" },
];

export const ITEM_TYPE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Books", value: "1" },
  { label: "CDs", value: "2" },
  { label: "Devices", value: "3" },
];

export const DEFAULT_PERIOD_TYPE = "quarter";
const FIELD_CLASS_NAME = "w-full rounded border border-gray-300 bg-white px-3 py-2";

export function getDefaultPeriodValue(periodType) {
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

export function createDefaultPeriodFilters() {
  return {
    periodType: DEFAULT_PERIOD_TYPE,
    periodValue: getDefaultPeriodValue(DEFAULT_PERIOD_TYPE),
    customStart: "",
    customEnd: "",
  };
}

export function appendPeriodParams(params, filters) {
  params.set("periodType", filters.periodType || "all");

  if (filters.periodType === "custom") {
    if (filters.customStart) {
      params.set("customStart", filters.customStart);
    }
    if (filters.customEnd) {
      params.set("customEnd", filters.customEnd);
    }
    return;
  }

  if (filters.periodType !== "all" && filters.periodValue) {
    params.set("periodValue", filters.periodValue);
  }
}

export function getPeriodSelectionLabel(periodType, periodValue, customStart, customEnd) {
  if (periodType === "custom") {
    if (customStart && customEnd) {
      return `${customStart} to ${customEnd}`;
    }

    if (customStart) {
      return `From ${customStart}`;
    }

    if (customEnd) {
      return `Until ${customEnd}`;
    }

    return "Custom Range";
  }

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

function getPeriodTriggerLabel(periodType, periodValue, customStart, customEnd) {
  if (periodType === "all") {
    return "All Time";
  }

  const typeLabel =
    PERIOD_TYPE_OPTIONS.find((option) => option.value === periodType)?.label ?? "Time Period";

  return `${typeLabel}: ${getPeriodSelectionLabel(
    periodType,
    periodValue,
    customStart,
    customEnd
  )}`;
}

function getPeriodPromptLabel(periodType) {
  if (periodType === "custom") {
    return "Pick a start and end date";
  }

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

export function SelectControl({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_CLASS_NAME}
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

export function InputControl({ label, value, onChange, type = "text", ...rest }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_CLASS_NAME}
        {...rest}
      />
    </div>
  );
}

export function CheckboxControl({ label, checked, onChange }) {
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

export function PeriodPickerControl({
  periodType,
  periodValue,
  customStart,
  customEnd,
  onPeriodTypeChange,
  onPeriodValueChange,
  onCustomDateChange,
}) {
  const controlRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);
  const [draftCustomStart, setDraftCustomStart] = useState(customStart || "");
  const [draftCustomEnd, setDraftCustomEnd] = useState(customEnd || "");

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

  useEffect(() => {
    setDraftCustomStart(customStart || "");
  }, [customStart]);

  useEffect(() => {
    setDraftCustomEnd(customEnd || "");
  }, [customEnd]);

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

  function handleCustomApply() {
    onCustomDateChange(draftCustomStart, draftCustomEnd);
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
            {getPeriodTriggerLabel(periodType, periodValue, customStart, customEnd)}
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
          {periodType === "custom" && (
            <CustomDatePickerPanel
              startDate={draftCustomStart}
              endDate={draftCustomEnd}
              onStartDateChange={setDraftCustomStart}
              onEndDateChange={setDraftCustomEnd}
              onApply={handleCustomApply}
            />
          )}
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

function CustomDatePickerPanel({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
}) {
  const hasValidRange = Boolean(startDate && endDate && startDate <= endDate);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InputControl
          label="From"
          type="date"
          value={startDate}
          onChange={onStartDateChange}
        />
        <InputControl
          label="To"
          type="date"
          value={endDate}
          onChange={onEndDateChange}
        />
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={!hasValidRange}
        className="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Apply Dates
      </button>

      {startDate && endDate && startDate > endDate && (
        <p className="text-sm text-red-600">End date must be on or after the start date.</p>
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

export function InfoBox({ text, error = false }) {
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

export function ReportTable({
  reportType,
  sort,
  sortDirection,
  data,
  columns,
  hiddenColumnKeys = [],
  onSortChange,
  onColumnVisibilityChange,
}) {
  const hiddenColumns = columns.filter(
    (column) => column.hideable !== false && hiddenColumnKeys.includes(column.key)
  );
  const visibleColumns = columns.filter((column) => !hiddenColumnKeys.includes(column.key));
  const fillerWidth = getTableWidth(hiddenColumns);
  const hasFillerColumn = fillerWidth > 0;
  const {
    topScrollRef,
    bottomScrollRef,
    topSpacerRef,
    handleTopScroll,
    handleBottomScroll,
  } = useSyncedHorizontalScroll(reportType, data.length, visibleColumns.length);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
      {hiddenColumns.length > 0 && (
        <HiddenColumnsToolbar
          columns={hiddenColumns}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      )}
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
        <table className="min-w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {visibleColumns.map((column) => (
              <col key={column.key} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
            {hasFillerColumn && <col style={{ width: `${fillerWidth}px` }} />}
          </colgroup>
          <thead className="bg-gray-100">
            <tr>
              {visibleColumns.map((column) => {
                const isSortedColumn = column.key === sort;

                return (
                  <th
                    key={column.key}
                    className={`border border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${
                      isSortedColumn ? "bg-green-100 text-green-900" : "text-gray-600"
                    }`}
                  >
                    <div className="space-y-2">
                      {column.sortable === false ? (
                        <div>{column.label}</div>
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

                      {column.hideable !== false && (
                        <button
                          type="button"
                          onClick={() => onColumnVisibilityChange(column.key, false)}
                          className="flex items-center gap-2 text-[11px] font-medium normal-case tracking-normal text-gray-500 hover:text-green-900"
                        >
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[10px] text-green-700">
                            ✓
                          </span>
                          <span>Shown</span>
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              {hasFillerColumn && <BlankHeaderCell />}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={getRowKey(reportType, row, index)}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`border border-gray-200 px-3 py-2 align-top ${
                      column.key === sort ? "bg-green-50" : ""
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {hasFillerColumn && <BlankBodyCell isEvenRow={index % 2 === 0} />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HiddenColumnsToolbar({ columns, onColumnVisibilityChange }) {
  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Hidden Columns
      </div>
      <div className="flex flex-wrap gap-2">
        {columns.map((column) => (
          <button
            key={column.key}
            type="button"
            onClick={() => onColumnVisibilityChange(column.key, true)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-green-300 hover:text-green-900"
          >
            Show {column.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlankHeaderCell() {
  return (
    <th
      aria-hidden="true"
      className="border border-gray-200 bg-gray-100 px-0 py-0"
    />
  );
}

function BlankBodyCell({ isEvenRow }) {
  return (
    <td
      aria-hidden="true"
      className={`border border-gray-200 ${isEvenRow ? "bg-white" : "bg-gray-50"}`}
    />
  );
}

export function RecommendationCell({ item }) {
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

function useSyncedHorizontalScroll(reportType, rowCount, columnCount) {
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
  }, [reportType, rowCount, columnCount]);

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

export function renderIdentityCell(title, subtitle) {
  return (
    <div className="min-w-[220px]">
      <div className="font-semibold text-green-900">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

export function renderPopularityIdentityCell(item) {
  return (
    <div className="min-w-[240px]">
      <div className="font-semibold text-green-900">{item.Item_name}</div>
      <div className="text-sm text-green-800">{getPopularityIdentityDetails(item)}</div>
    </div>
  );
}

export function renderPatronIdentityCell(item) {
  return renderIdentityCell(
    `${item.First_name} ${item.Last_name}`,
    `Patron ID: ${item.Person_ID}`
  );
}

export function getPopularityIdentityText(item) {
  return `${item.Item_name}\n${getPopularityIdentityDetails(item)}`;
}

export function getPatronIdentityText(item) {
  return `${item.First_name} ${item.Last_name}\nPatron ID: ${item.Person_ID}`;
}

export function getRecommendationText(item) {
  return `${item.recommendation_summary}\n${item.recommendation_detail}`;
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

function getColumnWidth(column) {
  if (column.width) {
    return column.width;
  }

  if (column.hideable === false) {
    return 260;
  }

  return 150;
}

function getTableWidth(columns) {
  return columns.reduce((total, column) => total + getColumnWidth(column), 0);
}

function getPopularityIdentityDetails(item) {
  const authorName =
    [item.author_firstName, item.author_lastName].filter(Boolean).join(" ") || "N/A";

  return [formatItemType(item.Item_type), item.genre || "N/A", authorName].join(" | ");
}

export function formatItemType(type) {
  if (Number(type) === 1) return "Book";
  if (Number(type) === 2) return "CD";
  if (Number(type) === 3) return "Device";
  return "Item";
}

export function formatRole(role) {
  return Number(role) === 1 ? "Staff" : "Patron";
}

export function formatAccountStatus(status) {
  return Number(status) === 1 ? "Active" : "Inactive";
}

export function formatBorrowStatus(status) {
  return Number(status) === 1 ? "Good Standing" : "Restricted";
}

export function formatNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

export function formatDecimal(value) {
  return Number(value ?? 0).toFixed(2);
}

export function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export function formatMoney(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function formatDate(value) {
  if (!value) return "N/A";
  const stringValue = String(value);
  return stringValue.length >= 10 ? stringValue.slice(0, 10) : stringValue;
}
