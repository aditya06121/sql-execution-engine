// sqliteValidationService.js

export class SqlValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SqlValidationError";
  }
}

/**
 * Remove SQL comments to avoid keyword hiding
 */
function stripComments(sql) {
  let cleaned = sql.replace(/--.*$/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  return cleaned;
}

/**
 * Normalize SQL for reliable matching
 */
function normalizeSql(sql) {
  return stripComments(sql).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * SQLite-specific dangerous patterns
 * These can escape sandbox or harm infra
 */
const BLOCKED_PATTERNS = [
  // File / DB attachment (sandbox escape)
  /\battach\s+database\b/,
  /\bdetach\s+database\b/,

  // SQLite engine manipulation
  /\bpragma\b/,

  // Virtual tables (can load extensions)
  /\bcreate\s+virtual\s+table\b/,

  // Recursive CTE (DoS risk)
  /\bwith\s+recursive\b/,

  // File output (rare but dangerous)
  /\binto\s+outfile\b/,
  /\bcopy\b/,
];

/**
 * Hard execution limits (defensive)
 */
const MAX_SQL_LENGTH = 10_000; // characters
const MAX_STATEMENTS = 20; // per submission

/**
 * Split SQL into statements safely (basic)
 */
function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Main validation function
 */
export function validateSql(sql) {
  if (!sql || typeof sql !== "string") {
    throw new SqlValidationError("Invalid SQL input");
  }

  if (sql.length > MAX_SQL_LENGTH) {
    throw new SqlValidationError("SQL input is too large");
  }

  // Use a comment-stripped but CASE-PRESERVING version to extract statements
  const stripped = stripComments(sql).replace(/\s+/g, " ").trim();
  const normalized = stripped.toLowerCase();

  if (!stripped) {
    throw new SqlValidationError("Empty SQL statement");
  }

  // Statement count limit (use case-preserving statements so we don't mangle string literals)
  const statements = splitStatements(stripped);
  if (statements.length > MAX_STATEMENTS) {
    throw new SqlValidationError("Too many SQL statements");
  }

  // Block dangerous patterns against normalized SQL
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new SqlValidationError(
        "This SQL command is not allowed in the execution environment",
      );
    }
  }

  // Passed all checks
  return {
    statements,
  };
}
