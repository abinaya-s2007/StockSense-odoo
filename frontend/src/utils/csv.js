// Small client-side CSV export helper - no backend round trip needed since
// the data is already loaded on the page (Products, Move History, etc).
export function downloadCSV(filename, rows, headers) {
  if (!rows || rows.length === 0) return;

  function escapeCell(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const lines = [headers.map((h) => escapeCell(h.label)).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h.key])).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
