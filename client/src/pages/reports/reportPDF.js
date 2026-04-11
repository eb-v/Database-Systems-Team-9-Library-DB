import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const EXPORT_TIMESTAMP_OPTIONS = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
};

export function downloadReportPdf({
  fileStem,
  title,
  periodLabel,
  sortLabel,
  sortDirection,
  summaryItems,
  columns,
  rows,
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  });

  const exportedAt = new Date().toLocaleString(undefined, EXPORT_TIMESTAMP_OPTIONS);
  const tableColumns = columns.map((column) => column.label);
  const tableRows = rows.map((row) =>
    columns.map((column) => getExportCellValue(column, row))
  );

  doc.setFontSize(18);
  doc.setTextColor(12, 74, 43);
  doc.text(title, 40, 42);

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(`Time Period: ${periodLabel}`, 40, 62);
  doc.text(`Sorted By: ${sortLabel} (${sortDirection === "asc" ? "Ascending" : "Descending"})`, 40, 76);
  doc.text(`Exported: ${exportedAt}`, 40, 90);

  let summaryY = 108;
  summaryItems
    .filter((item) => item.value && item.value !== "All")
    .forEach((item) => {
      doc.text(`${item.label}: ${item.value}`, 40, summaryY);
      summaryY += 14;
    });

  autoTable(doc, {
    startY: summaryY + 8,
    head: [tableColumns],
    body: tableRows,
    margin: { left: 40, right: 40, top: 40, bottom: 32 },
    styles: {
      fontSize: 8,
      cellPadding: 6,
      overflow: "linebreak",
      valign: "top",
      lineColor: [209, 213, 219],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [235, 245, 239],
      textColor: [20, 83, 45],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    didDrawPage: (data) => {
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - 70,
        pageHeight - 14
      );
    },
  });

  doc.save(`${fileStem}.pdf`);
}

function getExportCellValue(column, row) {
  if (typeof column.exportValue === "function") {
    return normalizeExportValue(column.exportValue(row));
  }

  return normalizeExportValue(row[column.key]);
}

function normalizeExportValue(value) {
  if (value == null || value === "") {
    return "N/A";
  }

  return String(value);
}
