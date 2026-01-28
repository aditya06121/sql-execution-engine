// evaluation/ResultNormalizer.js

/**
 * Normalize SQLite query output into a deterministic format
 * @param {Array<Object>} rows - Raw rows from SQLite
 * @returns {Array<Object>} normalized rows
 */
export function normalizeResult(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  // Empty result
  if (rows.length === 0) {
    return [];
  }

  // Normalize each row
  const normalizedRows = rows.map((row) => {
    const normalizedRow = {};

    // Sort columns alphabetically
    const sortedKeys = Object.keys(row).sort();

    for (const key of sortedKeys) {
      const normalizedKey = normalizeColumnName(key);
      const normalizedValue = normalizeValue(row[key]);
      normalizedRow[normalizedKey] = normalizedValue;
    }

    return normalizedRow;
  });

  // Sort rows deterministically
  normalizedRows.sort(rowComparator);

  return normalizedRows;
}

/* -------------------- */
/* Helper functions     */
/* -------------------- */

function normalizeColumnName(name) {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // SQLite booleans often come as 0 / 1
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Number(value.toFixed(6));
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function rowComparator(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  const allKeys = Array.from(new Set([...aKeys, ...bKeys])).sort();

  for (const key of allKeys) {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal === bVal) continue;
    if (aVal === null) return -1;
    if (bVal === null) return 1;

    return aVal < bVal ? -1 : 1;
  }

  return 0;
}
