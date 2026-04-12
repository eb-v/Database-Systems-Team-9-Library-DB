export default function Banner({ message, onDismiss }) {
  if (!message?.text) return null;
  const success = message.success;
  return (
    <div className={`mt-4 mb-6 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-sm text-sm font-medium
      ${success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
    >
      <div className="flex items-center gap-2">
        <span className={success ? "" : "text-lg"}>{success ? "✓" : "⊘"}</span>
        <span>{message.text}</span>
      </div>
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100">✕</button>
    </div>
  );
}
