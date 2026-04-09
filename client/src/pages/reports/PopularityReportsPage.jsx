/* eslint-disable react-refresh/only-export-components */
import {
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
      itemType: "All",
      ...createDefaultPeriodFilters(),
    };
  },
  buildParams(params, filters) {
    appendPeriodParams(params, filters);
    if (filters.itemType !== "All") {
      params.set("type", filters.itemType);
    }
  },
  getExportSummary(filters) {
    return [
      {
        label: "Item Type",
        value: ITEM_TYPE_OPTIONS.find((option) => option.value === filters.itemType)?.label ?? "All",
      },
    ];
  },
};

export function PopularityReportsFilters({ filters, onChange }) {
  return (
    <SelectControl
      label="Item Type"
      value={filters.itemType}
      onChange={(value) => onChange("itemType", value)}
      options={ITEM_TYPE_OPTIONS}
    />
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
