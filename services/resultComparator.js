import { normalizeResult } from "./resultNormalizer.js";

/**
 * Compare expected output with actual output
 * @param {any} expectedOutput - Expected output provided by client
 * @param {Array<Object>} actualOutput - Raw output from engine
 */
export function compareResults(expectedOutput, actualOutput) {
  // Normalize both sides
  const normalizedActual = normalizeResult(actualOutput);
  const normalizedExpected = normalizeExpected(expectedOutput);

  // Row count check
  if (normalizedActual.length !== normalizedExpected.length) {
    return {
      passed: false,
      reason: "Row count mismatch",
      expected: normalizedExpected,
      actual: normalizedActual,
    };
  }

  // Deep row-by-row comparison
  for (let i = 0; i < normalizedExpected.length; i++) {
    const expRow = normalizedExpected[i];
    const actRow = normalizedActual[i];

    if (!deepEqual(expRow, actRow)) {
      return {
        passed: false,
        reason: "Row data mismatch",
        expected: normalizedExpected,
        actual: normalizedActual,
      };
    }
  }

  return {
    passed: true,
  };
}

/* -------------------- */
/* Helpers              */
/* -------------------- */

/**
 * Normalize expected output to match engine-normalized format
 */
function normalizeExpected(expected) {
  if (!expected) return [];

  // Allow string JSON input
  if (typeof expected === "string") {
    try {
      expected = JSON.parse(expected);
    } catch {
      throw new Error("Expected output must be valid JSON");
    }
  }

  if (!Array.isArray(expected)) {
    throw new Error("Expected output must be an array");
  }

  return normalizeResult(expected);
}

/**
 * Deep equality check for row objects
 */
function deepEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!(key in b)) return false;
    if (!valueEqual(a[key], b[key])) return false;
  }

  return true;
}

function valueEqual(a, b) {
  if (a === b) return true;

  if (a === null || b === null) return a === b;

  if (typeof a === "number" && typeof b === "number") {
    // Numeric tolerance for floats
    return Math.abs(a - b) < 1e-6;
  }

  return a === b;
}
