import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import NavigationBar from "../components/NavigationBar";

const REPORT_OPTIONS = {
  popularity: {
    label: "Popularity Report",
    endpoint: "/api/reports/popularity",
    usesItemType: true,
    usesSort: true,
    defaultSort: "times_checked_out",
    sortOptions: [
      { label: "Most Popular", value: "times_checked_out" },
      { label: "Borrowing Rate", value: "borrowing_rate" },
    ],
  },
  fees: {
    label: "Unpaid Fees Report",
    endpoint: "/api/reports/fees",
    usesItemType: false,
    usesSort: true,
    defaultSort: "unpaid_total",
    sortOptions: [
      { label: "Highest Total Owed", value: "unpaid_total" },
      { label: "Most Unpaid Fees", value: "unpaid_fee_count" },
      { label: "Oldest Debt", value: "oldest_unpaid_date" },
    ],
  },
  patrons: {
    label: "Patron Activity Report",
    endpoint: "/api/reports/patrons",
    usesItemType: false,
    usesSort: true,
    defaultSort: "patrons_months",
    sortOptions: [
      { label: "Borrow Rate", value: "lifetime_borrow_rate" },
      { label: "Lifetime Borrows", value: "lifetime_borrows" },
      { label: "Patron Months", value: "patrons_months" },
      { label: "Active Holds", value: "active_holds" },
      { label: "Unpaid Total", value: "unpaid_total" },
    ],
  },
};

export default function ReportsPage() {
  const userType = sessionStorage.getItem("userType");
  const token = sessionStorage.getItem("token");

  const [reportType, setReportType] = useState("popularity");
  const [type, setType] = useState("All");
  const [sort, setSort] = useState(REPORT_OPTIONS.popularity.defaultSort);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentReport = REPORT_OPTIONS[reportType];

  useEffect(() => {
    setSort(currentReport.defaultSort);
  }, [reportType]);

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

        const params = new URLSearchParams();

        if (currentReport.usesItemType && type !== "All") {
          params.append("type", type === "Books" ? "1" : "2");
        }

        if (currentReport.usesSort && sort) {
          params.append("sort", sort);
        }

        const query = params.toString();
        const url = `http://localhost:3000${currentReport.endpoint}${query ? `?${query}` : ""}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();

        if (!res.ok) {
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
  }, [token, reportType, type, sort]);

  if (userType !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-green-900 mb-2">Reports</h1>
        <p className="text-gray-600 mb-6">{currentReport.label}</p>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Report</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="popularity">Popularity</option>
              <option value="fees">Unpaid Fees</option>
              <option value="patrons">Patrons</option>
            </select>
          </div>

          {currentReport.usesItemType && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option>All</option>
                <option>Books</option>
                <option>CDs</option>
              </select>
            </div>
          )}

          {currentReport.usesSort && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              >
                {currentReport.sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                sort={sort}
                item={item}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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
      <div className="flex items-center gap-3">
        <div className="min-w-0 w-56 shrink-0">
          <h3 className="text-lg font-semibold text-green-900 truncate">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>

        {featured && (
          <div className="shrink-0 rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 min-w-[170px]">
            <p className="text-[11px] uppercase tracking-wide text-gray-600">Sorted By</p>
            <p className="text-sm font-bold text-gray-900 truncate">{featured.label}</p>
            <p className="text-lg font-bold text-green-900 truncate">{featured.value}</p>
          </div>
        )}

        <div className="flex min-w-0 flex-1 gap-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className="min-w-0 flex-1 rounded-lg bg-gray-50 px-2 py-2 text-sm text-gray-700"
            >
              <p className="truncate">
                <span className="font-semibold">{field.label}:</span> {field.value}
              </p>
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
    {
      key: "times_checked_out",
      label: "Checked Out",
      value: item.times_checked_out ?? 0,
    },
    {
      key: "borrowing_rate",
      label: "Borrowing Rate",
      value: item.borrowing_rate ?? 0,
    },
    {
      key: "genre",
      label: "Genre",
      value: item.genre || "N/A",
    },
    {
      key: "num_copies",
      label: "Copies",
      value: item.num_copies ?? 0,
    },
    {
      key: "available_copies",
      label: "Available",
      value: item.available_copies ?? 0,
    },
    {
      key: "unavailable_copies",
      label: "Unavailable",
      value: item.unavailable_copies ?? 0,
    },
  ];

  return (
    <RowShell
      title={item.Item_name}
      subtitle={`Item ID: ${item.Item_ID}`}
      featured={getFeaturedField(fields, sort)}
      fields={getOtherFields(fields, sort)}
    />
  );
}

function FeeRow({ item, sort }) {
  const fields = [
    {
      key: "unpaid_total",
      label: "Unpaid Total",
      value: `$${Number(item.unpaid_total ?? 0).toFixed(2)}`,
    },
    {
      key: "unpaid_fee_count",
      label: "Unpaid Fees",
      value: item.unpaid_fee_count ?? 0,
    },
    {
      key: "oldest_unpaid_date",
      label: "Oldest Debt",
      value: item.oldest_unpaid_date || "N/A",
    },
    {
      key: "role",
      label: "Role",
      value: item.role,
    },
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
    {
      key: "patrons_months",
      label: "Patron Months",
      value: item.patrons_months ?? 0,
    },
    {
      key: "lifetime_borrow_rate",
      label: "Borrow Rate",
      value: item.lifetime_borrow_rate ?? 0,
    },
    {
      key: "lifetime_borrows",
      label: "Lifetime Borrows",
      value: item.lifetime_borrows ?? 0,
    },
    {
      key: "active_holds",
      label: "Active Holds",
      value: item.active_holds ?? 0,
    },
    {
      key: "unpaid_total",
      label: "Unpaid Total",
      value: `$${Number(item.unpaid_total ?? 0).toFixed(2)}`,
    },
    {
      key: "last_borrow_date",
      label: "Last Borrow",
      value: item.last_borrow_date || "Never",
    },
    {
      key: "role",
      label: "Role",
      value: item.role,
    },
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