import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import NavigationBar from "../components/NavigationBar";
import { apiFetch } from "../api";
import { getSessionRoleState } from "../auth";
import {
  InfoBox,
  PeriodPickerControl,
  SelectControl,
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

const REPORT_DEFINITIONS = {
  popularity: {
    ...popularityReportPage,
    FiltersComponent: PopularityReportsFilters,
    TableComponent: PopularityReportsTable,
    getColumns: getPopularityColumns,
  },
  fees: {
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

  function updateCurrentFilters(updater) {
    setFiltersByReport((prev) => ({
      ...prev,
      [reportType]: updater(prev[reportType]),
    }));
  }

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
        setExportError("");
        const url = buildReportUrl(activeReport, currentSort, currentSortDirection, currentFilters);

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
  }, [token, activeReport, currentSort, currentSortDirection, currentFilters]);

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

    setHiddenColumnsByReport((prev) => ({
      ...prev,
      [reportType]: nextHiddenKeys,
    }));

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

      const response = await apiFetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
          />
        )}
      </div>
    </div>
  );
}
