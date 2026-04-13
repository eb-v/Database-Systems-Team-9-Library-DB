/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import {
  InputControl,
  ITEM_TYPE_OPTIONS,
  RecommendationCell,
  ReportTable,
  SelectControl,
  appendPeriodParams,
  createDefaultPeriodFilters,
  formatDate,
  formatDecimal,
  formatNumber,
  formatPercent,
  getPopularityIdentityText,
  getRecommendationText,
  renderPopularityIdentityCell,
} from "./reportShared";

const ALL_OPTION = "All";
const BOOK_TYPE = "1";
const CD_ITEM_TYPE = "2";
const DEVICE_ITEM_TYPE = "3";
const ITEM_TYPE_FILTER_OPTIONS = ITEM_TYPE_OPTIONS.filter((option) => option.value !== ALL_OPTION);
const TYPE_FILTER_DEFAULTS = {
  genre: "",
  authorName: "",
  cdType: ALL_OPTION,
  deviceType: ALL_OPTION,
};

const CD_TYPE_OPTIONS = [
  { label: "All", value: ALL_OPTION },
  { label: "DVD", value: "1" },
  { label: "Blu ray", value: "2" },
  { label: "CD", value: "3" },
];

const DEVICE_TYPE_OPTIONS = [
  { label: "All", value: ALL_OPTION },
  { label: "Computer", value: "1" },
  { label: "Tablet", value: "2" },
  { label: "Laptop", value: "3" },
];

function setTrimmedParam(params, key, value) {
  const normalized = value.trim();

  if (normalized) {
    params.set(key, normalized);
  }
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? ALL_OPTION;
}

function isTypeSelected(itemTypes, itemType) {
  return itemTypes.length === 0 || itemTypes.includes(itemType);
}

function isAllTypesSelected(itemTypes) {
  return itemTypes.length === 0 || itemTypes.length === ITEM_TYPE_FILTER_OPTIONS.length;
}

function getSelectedTypeLabel(itemTypes) {
  if (isAllTypesSelected(itemTypes)) {
    return ALL_OPTION;
  }

  return ITEM_TYPE_FILTER_OPTIONS.filter((option) => itemTypes.includes(option.value))
    .map((option) => option.label)
    .join(", ");
}

function buildTypeSpecificExportSummary(filters) {
  if (isAllTypesSelected(filters.itemTypes)) {
    return [];
  }

  const summary = [];

  if (isTypeSelected(filters.itemTypes, BOOK_TYPE)) {
    summary.push(
      { label: "Genre Search", value: filters.genre.trim() || ALL_OPTION },
      { label: "Author Search", value: filters.authorName.trim() || ALL_OPTION }
    );
  }

  if (isTypeSelected(filters.itemTypes, CD_ITEM_TYPE)) {
    summary.push({ label: "CD Type", value: getOptionLabel(CD_TYPE_OPTIONS, filters.cdType) });
  }

  if (isTypeSelected(filters.itemTypes, DEVICE_ITEM_TYPE)) {
    summary.push({
      label: "Device Type",
      value: getOptionLabel(DEVICE_TYPE_OPTIONS, filters.deviceType),
    });
  }

  return summary;
}

function resetTypeSpecificFilters(nextTypes, onChange) {
  if (isAllTypesSelected(nextTypes)) {
    Object.entries(TYPE_FILTER_DEFAULTS).forEach(([key, value]) => onChange(key, value));
    return;
  }

  if (!isTypeSelected(nextTypes, BOOK_TYPE)) {
    onChange("genre", TYPE_FILTER_DEFAULTS.genre);
    onChange("authorName", TYPE_FILTER_DEFAULTS.authorName);
  }

  if (!isTypeSelected(nextTypes, CD_ITEM_TYPE)) {
    onChange("cdType", TYPE_FILTER_DEFAULTS.cdType);
  }

  if (!isTypeSelected(nextTypes, DEVICE_ITEM_TYPE)) {
    onChange("deviceType", TYPE_FILTER_DEFAULTS.deviceType);
  }
}

function PopularityTypeSpecificFilters({ itemTypes, filters, onChange }) {
  if (isAllTypesSelected(itemTypes)) {
    return null;
  }

  return (
    <>
      {isTypeSelected(itemTypes, BOOK_TYPE) && (
        <>
          <InputControl
            label="Genre"
            value={filters.genre}
            onChange={(value) => onChange("genre", value)}
            placeholder="Search by genre"
          />
          <InputControl
            label="Author Name"
            value={filters.authorName}
            onChange={(value) => onChange("authorName", value)}
            placeholder="Search by author name"
          />
        </>
      )}
      {isTypeSelected(itemTypes, CD_ITEM_TYPE) && (
        <SelectControl
          label="CD Type"
          value={filters.cdType}
          onChange={(value) => onChange("cdType", value)}
          options={CD_TYPE_OPTIONS}
        />
      )}
      {isTypeSelected(itemTypes, DEVICE_ITEM_TYPE) && (
        <SelectControl
          label="Device Type"
          value={filters.deviceType}
          onChange={(value) => onChange("deviceType", value)}
          options={DEVICE_TYPE_OPTIONS}
        />
      )}
    </>
  );
}

function ItemTypeMultiSelectControl({ value, onChange }) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function toggleType(type) {
    const currentValue =
      value.length === 0 ? ITEM_TYPE_FILTER_OPTIONS.map((option) => option.value) : value;
    const nextValue = currentValue.includes(type)
      ? currentValue.filter((selectedType) => selectedType !== type)
      : [...currentValue, type];

    onChange(
      nextValue.length === 0 || nextValue.length === ITEM_TYPE_FILTER_OPTIONS.length
        ? []
        : nextValue
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm text-gray-600">Item Type</label>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-left"
      >
        <span className="truncate">{getSelectedTypeLabel(value)}</span>
        <span className="ml-3 text-xs text-gray-500">{open ? "Close" : "Choose"}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="space-y-2">
            {ITEM_TYPE_FILTER_OPTIONS.map((option) => {
              const checked = isTypeSelected(value, option.value);

              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const popularityReportPage = {
  key: "popularity",
  label: "Popularity",
  pdfTitle: "Popularity Report",
  description:
    "Identify high-demand titles, inventory pressure, and items that may need more copies.",
  endpoint: "/api/reports/popularity",
  defaultSort: "times_checked_out",
  createInitialFilters() {
    return {
      itemTypes: [],
      itemName: "",
      genre: "",
      authorName: "",
      cdType: ALL_OPTION,
      deviceType: ALL_OPTION,
      ...createDefaultPeriodFilters(),
    };
  },
  buildParams(params, filters) {
    appendPeriodParams(params, filters);
    filters.itemTypes.forEach((itemType) => params.append("type", itemType));
    setTrimmedParam(params, "itemName", filters.itemName);

    if (!isAllTypesSelected(filters.itemTypes) && isTypeSelected(filters.itemTypes, BOOK_TYPE)) {
      setTrimmedParam(params, "genre", filters.genre);
      setTrimmedParam(params, "authorName", filters.authorName);
    }

    if (
      !isAllTypesSelected(filters.itemTypes) &&
      isTypeSelected(filters.itemTypes, CD_ITEM_TYPE) &&
      filters.cdType !== ALL_OPTION
    ) {
      params.set("cdType", filters.cdType);
    }

    if (
      !isAllTypesSelected(filters.itemTypes) &&
      isTypeSelected(filters.itemTypes, DEVICE_ITEM_TYPE) &&
      filters.deviceType !== ALL_OPTION
    ) {
      params.set("deviceType", filters.deviceType);
    }
  },
  getExportSummary(filters) {
    return [
      {
        label: "Item Type",
        value: getSelectedTypeLabel(filters.itemTypes),
      },
      { label: "Item Search", value: filters.itemName.trim() || ALL_OPTION },
      ...buildTypeSpecificExportSummary(filters),
    ];
  },
};

export function PopularityReportsFilters({ filters, onChange }) {
  function handleItemTypesChange(nextTypes) {
    onChange("itemTypes", nextTypes);
    resetTypeSpecificFilters(nextTypes, onChange);
  }

  return (
    <>
      <ItemTypeMultiSelectControl value={filters.itemTypes} onChange={handleItemTypesChange} />
      <InputControl
        label="Item Name"
        value={filters.itemName}
        onChange={(value) => onChange("itemName", value)}
        placeholder="Search by item title"
      />
      <PopularityTypeSpecificFilters
        itemTypes={filters.itemTypes}
        filters={filters}
        onChange={onChange}
      />
    </>
  );
}

export function PopularityReportsTable({
  data,
  periodLabel,
  sort,
  sortDirection,
  hiddenColumnKeys,
  onSortChange,
  onColumnVisibilityChange,
}) {
  const columns = getPopularityColumns(periodLabel);

  return (
    <ReportTable
      reportType="popularity"
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

export function getPopularityColumns(periodLabel) {
  return [
    {
      key: "item_name",
      label: "Item",
      sortable: false,
      hideable: false,
      render: renderPopularityIdentityCell,
      exportValue: getPopularityIdentityText,
    },
    {
      key: "times_checked_out",
      label: `Checkouts (${periodLabel})`,
      render: (item) => formatNumber(item.times_checked_out),
      exportValue: (item) => formatNumber(item.times_checked_out),
    },
    {
      key: "borrowing_rate",
      label: `Borrow Rate (${periodLabel})`,
      render: (item) => formatDecimal(item.borrowing_rate),
      exportValue: (item) => formatDecimal(item.borrowing_rate),
    },
    {
      key: "utilization_rate",
      label: `Utilization (${periodLabel})`,
      render: (item) => formatPercent(item.utilization_rate),
      exportValue: (item) => formatPercent(item.utilization_rate),
    },
    {
      key: "demand_ratio",
      label: `Demand Ratio (${periodLabel})`,
      render: (item) => formatDecimal(item.demand_ratio),
      exportValue: (item) => formatDecimal(item.demand_ratio),
    },
    {
      key: "active_holds",
      label: `Holds (${periodLabel})`,
      render: (item) => formatNumber(item.active_holds),
      exportValue: (item) => formatNumber(item.active_holds),
    },
    {
      key: "unique_borrowers",
      label: `Unique Borrowers (${periodLabel})`,
      render: (item) => formatNumber(item.unique_borrowers),
      exportValue: (item) => formatNumber(item.unique_borrowers),
    },
    {
      key: "num_copies",
      label: "Copies Owned",
      render: (item) => formatNumber(item.num_copies),
      exportValue: (item) => formatNumber(item.num_copies),
    },
    {
      key: "available_copies",
      label: "Available Now",
      render: (item) => formatNumber(item.available_copies),
      exportValue: (item) => formatNumber(item.available_copies),
    },
    {
      key: "checked_out_copies",
      label: "Checked Out Now",
      render: (item) => formatNumber(item.checked_out_copies),
      exportValue: (item) => formatNumber(item.checked_out_copies),
    },
    {
      key: "last_borrow_date",
      label: `Last Borrowed (${periodLabel})`,
      render: (item) => formatDate(item.last_borrow_date),
      exportValue: (item) => formatDate(item.last_borrow_date),
    },
    {
      key: "recommended_additional_copies",
      label: "Stock Recommendation",
      render: (item) => <RecommendationCell item={item} />,
      exportValue: getRecommendationText,
    },
  ];
}
