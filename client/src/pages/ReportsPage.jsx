import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";
import { getSessionRoleState } from "../auth";
import {
  appendPeriodParams,
  InfoBox,
  PeriodPickerControl,
  SelectControl,
  formatMoney,
  formatNumber,
  getDefaultPeriodValue,
  getPeriodSelectionLabel,
} from "./reports/reportShared";
import {
  PopularityReportsFilters,
  PopularityReportsTable,
  getPopularityColumns,
  popularityReportPage,
} from "./reports/PopularityReportsPage";
import {
  FeesReportsFilters,
  FeesReportsTable,
  feesReportPage,
  getFeesColumns,
} from "./reports/FeesReportsPage";
import {
  PatronActivityReportsFilters,
  PatronActivityReportsTable,
  getPatronActivityColumns,
  patronActivityReportPage,
} from "./reports/PatronActivityReportsPage";
import { downloadReportPdf } from "./reports/reportPDF";

const EXPORT_LIMIT = 1000;
const EMPTY_OVERVIEW = {
  total_items: 0,
  total_books: 0,
  total_cds: 0,
  total_devices: 0,
  total_borrowed: 0,
  total_active_borrows: 0,
  total_fees: 0,
  total_revenue: 0,
};

const REPORT_DEFINITIONS = {
  popularity: {
    ...popularityReportPage,
    FiltersComponent: PopularityReportsFilters,
    TableComponent: PopularityReportsTable,
    getColumns: getPopularityColumns,
  },
  revenue: {
    ...feesReportPage,
    FiltersComponent: FeesReportsFilters,
    TableComponent: FeesReportsTable,
    getColumns: getFeesColumns,
  },
  patrons: {
    ...patronActivityReportPage,
    FiltersComponent: PatronActivityReportsFilters,
    TableComponent: PatronActivityReportsTable,
    getColumns: getPatronActivityColumns,
  },
};

const REPORT_OPTIONS = Object.values(REPORT_DEFINITIONS).map((report) => ({
  label: report.label,
  value: report.key,
}));

function createReportStateMap(getValue) {
  return Object.fromEntries(
    Object.values(REPORT_DEFINITIONS).map((report) => [report.key, getValue(report)])
  );
}

function createInitialSortState() {
  return createReportStateMap((report) => report.defaultSort);
}

function createInitialSortDirectionState() {
  return createReportStateMap(() => "desc");
}

function createInitialFilterState() {
  return createReportStateMap((report) => report.createInitialFilters());
}

function createInitialHiddenColumnsState() {
  return createReportStateMap(() => []);
}

function createAuthOptions(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function normalizeOverview(payload) {
  return {
    total_items: Number(payload.total_items ?? 0),
    total_books: Number(payload.total_books ?? 0),
    total_cds: Number(payload.total_cds ?? 0),
    total_devices: Number(payload.total_devices ?? 0),
    total_borrowed: Number(payload.total_borrowed ?? 0),
    total_active_borrows: Number(payload.total_active_borrows ?? 0),
    total_fees: Number(payload.total_fees ?? 0),
    total_revenue: Number(payload.total_revenue ?? 0),
  };
}

function buildReportParams(reportDefinition, sort, sortDirection, filters, extraParams = {}) {
  const params = new URLSearchParams();

  if (sort) {
    params.set("sort", sort);
  }

  if (sortDirection) {
    params.set("direction", sortDirection);
  }

  reportDefinition.buildParams(params, filters);
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params;
}

function buildReportUrl(reportDefinition, sort, sortDirection, filters, extraParams) {
  const params = buildReportParams(reportDefinition, sort, sortDirection, filters, extraParams);
  const query = params.toString();
  return `${reportDefinition.endpoint}${query ? `?${query}` : ""}`;
}

function buildOverviewUrl(filters) {
  const params = new URLSearchParams();
  appendPeriodParams(params, filters);
  const query = params.toString();
  return `/api/reports/overview${query ? `?${query}` : ""}`;
}

function createReportFileStem(reportKey, periodLabel) {
  const normalizedPeriod = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${reportKey}-report-${normalizedPeriod || "all-time"}`;
}

function getFallbackSortColumn(columns, hiddenKeys, preferredKey) {
  const preferredColumn = columns.find(
    (column) =>
      column.key === preferredKey &&
      column.sortable !== false &&
      !hiddenKeys.includes(column.key)
  );

  if (preferredColumn) {
    return preferredColumn.key;
  }

  return (
    columns.find(
      (column) => column.sortable !== false && !hiddenKeys.includes(column.key)
    )?.key || preferredKey
  );
}

function getNextHiddenColumnKeys(hiddenKeys, columnKey, shouldShow) {
  if (shouldShow) {
    return hiddenKeys.filter((key) => key !== columnKey);
  }

  return hiddenKeys.includes(columnKey) ? hiddenKeys : [...hiddenKeys, columnKey];
}

function updateScopedReportState(setState, reportKey, nextValue) {
  setState((prev) => ({
    ...prev,
    [reportKey]:
      typeof nextValue === "function" ? nextValue(prev[reportKey]) : nextValue,
  }));
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
  const [hiddenColumnsByReport, setHiddenColumnsByReport] = useState(
    createInitialHiddenColumnsState
  );
  const [data, setData] = useState([]);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [revenueKpis, setRevenueKpis] = useState(null);
  const [revenueKpisLoading, setRevenueKpisLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);

  const activeReport = REPORT_DEFINITIONS[reportType];
  const currentSort = sortByReport[reportType];
  const currentSortDirection = sortDirectionByReport[reportType];
  const currentFilters = filtersByReport[reportType];
  const reportPeriodLabel = getPeriodSelectionLabel(
    currentFilters.periodType,
    currentFilters.periodValue,
    currentFilters.customStart,
    currentFilters.customEnd
  );
  const ActiveFiltersComponent = activeReport.FiltersComponent;
  const ActiveTableComponent = activeReport.TableComponent;
  const currentColumns = activeReport.getColumns(reportPeriodLabel);
  const hiddenColumnKeys = hiddenColumnsByReport[reportType];
  const overviewUrl = useMemo(
    () =>
      buildOverviewUrl({
        periodType: currentFilters.periodType,
        periodValue: currentFilters.periodValue,
        customStart: currentFilters.customStart,
        customEnd: currentFilters.customEnd,
      }),
    [
      currentFilters.periodType,
      currentFilters.periodValue,
      currentFilters.customStart,
      currentFilters.customEnd,
    ]
  );

  const revenueKpisUrl = useMemo(() => {
    if (reportType !== "revenue") return null;
    const params = new URLSearchParams();
    appendPeriodParams(params, currentFilters);
    if (currentFilters.role && currentFilters.role !== "All") params.set("role", currentFilters.role);
    if (currentFilters.feeType && currentFilters.feeType !== "All") params.set("feeType", currentFilters.feeType);
    if (currentFilters.itemType && currentFilters.itemType !== "All") params.set("itemType", currentFilters.itemType);
    if (currentFilters.paidStatus && currentFilters.paidStatus !== "All") params.set("paidStatus", currentFilters.paidStatus);
    const query = params.toString();
    return `/api/reports/revenue-overview${query ? `?${query}` : ""}`;
  }, [
    reportType,
    currentFilters.periodType,
    currentFilters.periodValue,
    currentFilters.customStart,
    currentFilters.customEnd,
    currentFilters.role,
    currentFilters.feeType,
    currentFilters.itemType,
    currentFilters.paidStatus,
  ]);

  function updateCurrentSort(value) {
    updateScopedReportState(setSortByReport, reportType, value);
  }

  function updateCurrentSortDirection(value) {
    updateScopedReportState(setSortDirectionByReport, reportType, value);
  }

  function updateCurrentFilters(updater) {
    updateScopedReportState(setFiltersByReport, reportType, updater);
  }

  useEffect(() => {
    if (!token) {
      setError("Not logged in.");
      setLoading(false);
      setOverviewLoading(false);
      return;
    }

    async function fetchReport() {
      try {
        setLoading(true);
        setError("");
        setExportError("");
        const url = buildReportUrl(activeReport, currentSort, currentSortDirection, currentFilters);

        const response = await apiFetch(url, createAuthOptions(token));

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
  }, [token, activeReport, currentSort, currentSortDirection, currentFilters]);

  useEffect(() => {
    if (!token) {
      setOverviewLoading(false);
      return;
    }

    async function fetchOverview() {
      try {
        setOverviewLoading(true);
        const response = await apiFetch(overviewUrl, createAuthOptions(token));

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || "Failed to load overview");
        }

        setOverview(normalizeOverview(json));
      } catch (err) {
        console.error("Failed to fetch report overview:", err);
        setOverview(EMPTY_OVERVIEW);
      } finally {
        setOverviewLoading(false);
      }
    }

    fetchOverview();
  }, [
    token,
    overviewUrl,
  ]);

  useEffect(() => {
    if (!revenueKpisUrl || !token) {
      setRevenueKpis(null);
      return;
    }

    async function fetchRevenueKpis() {
      setRevenueKpisLoading(true);
      try {
        const response = await apiFetch(revenueKpisUrl, createAuthOptions(token));
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Failed to load revenue KPIs");
        setRevenueKpis(json);
      } catch (err) {
        console.error("Failed to fetch revenue KPIs:", err);
        setRevenueKpis(null);
      } finally {
        setRevenueKpisLoading(false);
      }
    }

    fetchRevenueKpis();
  }, [token, revenueKpisUrl]);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  function handleColumnSort(columnKey) {
    const nextDirection =
      currentSort === columnKey && currentSortDirection === "desc" ? "asc" : "desc";

    updateCurrentSort(columnKey);
    updateCurrentSortDirection(nextDirection);
  }

  function handleColumnVisibilityChange(columnKey, shouldShow) {
    const nextHiddenKeys = getNextHiddenColumnKeys(hiddenColumnKeys, columnKey, shouldShow);

    updateScopedReportState(setHiddenColumnsByReport, reportType, nextHiddenKeys);

    if (!shouldShow && currentSort === columnKey) {
      updateCurrentSort(
        getFallbackSortColumn(currentColumns, nextHiddenKeys, activeReport.defaultSort)
      );
      updateCurrentSortDirection("desc");
    }
  }

  function updateCurrentFilter(key, value) {
    if (key === "periodType") {
      updateCurrentFilters((filters) => ({
        ...filters,
          periodType: value,
          periodValue:
            filters.periodType === value
              ? filters.periodValue
              : getDefaultPeriodValue(value),
      }));
      return;
    }

    if (key === "customDateRange") {
      updateCurrentFilters((filters) => ({
        ...filters,
        customStart: value.startDate,
        customEnd: value.endDate,
      }));
      return;
    }

    updateCurrentFilters((filters) => ({
      ...filters,
      [key]: value,
    }));
  }

  async function handleDownloadPdf() {
    if (!token) {
      setExportError("Not logged in.");
      return;
    }

    try {
      setExporting(true);
      setExportError("");

      const url = buildReportUrl(activeReport, currentSort, currentSortDirection, currentFilters, {
        limit: EXPORT_LIMIT,
      });

      const response = await apiFetch(url, createAuthOptions(token));

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to export report");
      }

      const exportRows = Array.isArray(json) ? json : [];
      const sortLabel =
        currentColumns.find((column) => column.key === currentSort)?.label || currentSort;
      const summaryItems = [
        { label: "Rows Exported", value: String(exportRows.length) },
        ...(activeReport.getExportSummary?.(currentFilters) || []),
      ];

      downloadReportPdf({
        fileStem: createReportFileStem(activeReport.key, reportPeriodLabel),
        title: activeReport.pdfTitle || `${activeReport.label} Report`,
        periodLabel: reportPeriodLabel,
        sortLabel,
        sortDirection: currentSortDirection,
        summaryItems,
        columns: currentColumns,
        rows: exportRows,
      });
    } catch (err) {
      console.error("Failed to export PDF:", err);
      setExportError(err.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-green-900 mb-2">Reports</h1>
            <p className="text-gray-600">{activeReport.description}</p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={loading || exporting}
            className="rounded-lg bg-green-900 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {exporting ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <SelectControl
              label="Report"
              value={reportType}
              onChange={setReportType}
              options={REPORT_OPTIONS}
            />

            <PeriodPickerControl
              periodType={currentFilters.periodType}
              periodValue={currentFilters.periodValue}
              customStart={currentFilters.customStart}
              customEnd={currentFilters.customEnd}
              onPeriodTypeChange={(value) => updateCurrentFilter("periodType", value)}
              onPeriodValueChange={(value) => updateCurrentFilter("periodValue", value)}
              onCustomDateChange={(startDate, endDate) =>
                updateCurrentFilter("customDateRange", { startDate, endDate })
              }
            />

            <ActiveFiltersComponent filters={currentFilters} onChange={updateCurrentFilter} />
          </div>
        </div>

        {reportType === "revenue" ? (
          <RevenueKPICards kpis={revenueKpis} loading={revenueKpisLoading} />
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <InventoryOverviewCard overview={overview} overviewLoading={overviewLoading} />
            <OverviewStatCard
              label={`Borrows Total (${reportPeriodLabel})`}
              value={overviewLoading ? "Loading..." : formatNumber(overview.total_borrowed)}
            />
            <OverviewStatCard
              label={`Active Borrows (${reportPeriodLabel})`}
              value={overviewLoading ? "Loading..." : formatNumber(overview.total_active_borrows)}
            />
            <OverviewStatCard
              label={`Fees Total (${reportPeriodLabel})`}
              value={overviewLoading ? "Loading..." : formatNumber(overview.total_fees)}
            />
            <OverviewStatCard
              label={`Revenue Total (${reportPeriodLabel})`}
              value={overviewLoading ? "Loading..." : formatMoney(overview.total_revenue)}
            />
          </div>
        )}

        {loading && <InfoBox text="Loading..." />}
        {error && <InfoBox text={error} error />}
        {!error && exportError && <InfoBox text={exportError} error />}
        {!loading && !error && data.length === 0 && <InfoBox text="No data found." />}

        {!loading && !error && data.length > 0 && (
          <ActiveTableComponent
            data={data}
            periodLabel={reportPeriodLabel}
            sort={currentSort}
            sortDirection={currentSortDirection}
            hiddenColumnKeys={hiddenColumnKeys}
            onSortChange={handleColumnSort}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            filters={currentFilters}
          />
        )}
      </div>
    </div>
  );
}

function InventoryOverviewCard({ overview, overviewLoading }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Total Items In DB
      </div>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-green-900">
            {overviewLoading ? "Loading..." : formatNumber(overview.total_items)}
          </div>
        </div>
        <div className="min-w-[96px] space-y-1 text-right text-xs text-gray-600">
          <div>Books: {overviewLoading ? "..." : formatNumber(overview.total_books)}</div>
          <div>CDs: {overviewLoading ? "..." : formatNumber(overview.total_cds)}</div>
          <div>Devices: {overviewLoading ? "..." : formatNumber(overview.total_devices)}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewStatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-center shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-green-900">{value}</div>
    </div>
  );
}

function RevenueKPICards({ kpis, loading }) {
  const fmt = (v) => (loading || !kpis ? "—" : formatMoney(v));
  const fmtN = (v) => (loading || !kpis ? "—" : formatNumber(v));

  const collectionRate = !loading && kpis && Number(kpis.revenue_expected) > 0
    ? `${((Number(kpis.revenue_collected) / Number(kpis.revenue_expected)) * 100).toFixed(1)}%`
    : (loading || !kpis ? "—" : "N/A");

  const avgFee = !loading && kpis && Number(kpis.total_fees) > 0
    ? formatMoney(Number(kpis.revenue_expected) / Number(kpis.total_fees))
    : (loading || !kpis ? "—" : "N/A");

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
      {/* Row 1: revenue money metrics */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-green-700">Revenue Collected</div>
        <div className="mt-2 text-xl font-bold text-green-900">{fmt(kpis?.revenue_collected)}</div>
        <div className="mt-1 text-xs text-green-700">From paid fees</div>
      </div>
      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">Revenue Backlog</div>
        <div className="mt-2 text-xl font-bold text-orange-700">{fmt(kpis?.revenue_backlog)}</div>
        <div className="mt-1 text-xs text-orange-600">Unpaid outstanding</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expected Revenue</div>
        <div className="mt-2 text-xl font-bold text-green-900">{fmt(kpis?.revenue_expected)}</div>
        <div className="mt-1 text-xs text-gray-500">All fees incurred</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Collection Rate</div>
        <div className="mt-2 text-xl font-bold text-green-900">{collectionRate}</div>
        <div className="mt-1 text-xs text-gray-500">Collected vs. expected</div>
      </div>

      {/* Row 2: counts and per-fee detail */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Fees</div>
        <div className="mt-2 text-xl font-bold text-green-900">{fmtN(kpis?.total_fees)}</div>
        <div className="mt-1 text-xs text-gray-400">Fees incurred</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unpaid Fees</div>
        <div className="mt-2 text-xl font-bold text-red-600">{fmtN(kpis?.unpaid_fee_count)}</div>
        <div className="mt-1 text-xs text-gray-400">Not yet collected</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avg Fee Amount</div>
        <div className="mt-2 text-xl font-bold text-green-900">{avgFee}</div>
        <div className="mt-1 text-xs text-gray-400">Per fee incurred</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Top Item by Fees</div>
        <div className="mt-2 text-base font-bold text-green-900 truncate">
          {loading || !kpis ? "—" : (kpis.top_item_name ?? "N/A")}
        </div>
        {!loading && kpis?.top_item_name && (
          <div className="mt-1 text-xs text-gray-500">{formatMoney(kpis.top_item_fees)} total</div>
        )}
      </div>
    </div>
  );
}
