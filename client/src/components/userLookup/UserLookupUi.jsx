const BADGE_COLORS = {
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
  gray: "bg-gray-100 text-gray-700",
};

const PANEL_COLORS = {
  green: "hover:bg-green-50",
  blue: "hover:bg-blue-50",
  purple: "hover:bg-purple-50",
  gray: "hover:bg-gray-50",
};

export function StatusBadge({ label, color = "gray" }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_COLORS[color] || BADGE_COLORS.gray}`}>
      {label}
    </span>
  );
}

export function QuickFilterButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
        active
          ? "border border-green-900 bg-green-900 text-white shadow-sm"
          : "border border-gray-300 bg-white text-gray-700 hover:border-green-200 hover:bg-green-50 hover:text-green-900"
      }`}
    >
      {label}
    </button>
  );
}

export function AccordionPanel({ label, count, open, onToggle, loading, color = "green", children }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-gray-800 transition-colors ${PANEL_COLORS[color] || PANEL_COLORS.green}`}
      >
        <div className="flex items-center gap-3">
          <span>{label}</span>
          {count != null && count > 0 && <StatusBadge label={count} color={color} />}
        </div>
        <span className="text-sm text-gray-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t px-5 py-4">
          {loading ? <p className="text-sm italic text-gray-400">Loading...</p> : children}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ text }) {
  return <p className="text-sm italic text-gray-400">{text}</p>;
}

export function Field({ label, required, labelClassName = "", children }) {
  return (
    <div>
      <label className={`mb-1 block text-sm font-semibold text-gray-700 ${labelClassName}`}>
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

export function DetailGroup({ title, fields }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-green-800">{title}</h3>
      {fields.map((field) => (
        <div key={field.label}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{field.label}</p>
          <p className="text-sm text-gray-800">{field.value || "-"}</p>
        </div>
      ))}
    </div>
  );
}

export function SummaryCard({ title, value, description }) {
  return (
    <div className="rounded-xl border bg-gray-50 p-5 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold text-green-900">{title}</h3>
      <p className="mb-1 text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
