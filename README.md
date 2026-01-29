---
# SQL Execution and Evaluation Engine

This project is a backend service that provides a safe, deterministic SQL execution and evaluation environment. It is designed for use cases such as skill assessments, coding tests, and SQL competency evaluation.

The system allows clients to execute SQL queries against a predefined dataset, validate results, compare outputs against expected answers, and reset database state on demand.
---

## Key Features

- Safe SQL execution with validation
- SQLite-based isolated execution per question
- Sticky database state per question until reset or submission
- Deterministic output normalization and comparison
- REST APIs for execution, submission, and reset
- Supports intermediate to advanced SQL including joins and aggregates

---

## Tech Stack

- Node.js
- Express.js
- SQLite
- better-sqlite3
- JavaScript (ES Modules)

---

## Architecture Overview

The system follows a layered design:

1. SQL Validation Layer
   Filters out dangerous SQL commands before execution.

2. Execution Engine
   Creates a question-scoped SQLite database, applies seed data, executes SQL, and manages lifecycle.

3. Output Normalization
   Converts raw SQLite output into a canonical format.

4. Result Comparison
   Compares normalized actual output with expected output.

5. REST Controllers
   Expose APIs for execution, submission, and reset.

---

## Database Model

The database is seeded with a fixed dataset containing:

- Departments
- Employees
- Customers
- Products
- Orders
- Order Items
- Payments

The seed data is applied when a new execution engine is initialized and remains unchanged until reset or submission.

---

## API Endpoints

### POST /execute

Executes SQL code against a question-scoped database without comparing results.

This endpoint is intended for iterative query testing and exploration.

#### Request Body

```json
{
  "questionId": 1,
  "code": "SELECT COUNT(*) AS cnt FROM employees;"
}
```

#### Response Success

```json
{
  "success": true,
  "output": [{ "cnt": 6 }],
  "outputs": [[{ "cnt": 6 }]]
}
```

#### Response Execution Error

```json
{
  "success": false,
  "error": "no such table: employees_backup"
}
```

---

### POST /submit

Executes SQL code and compares the result with an expected output. The database is destroyed after submission.

This endpoint is intended for final evaluation and grading.

#### Request Body

```json
{
  "questionId": 2,
  "code": "SELECT COUNT(*) AS completed_payments FROM payments WHERE status = 'COMPLETED';",
  "expectedOutput": [{ "completed_payments": 3 }]
}
```

#### Response Pass

```json
{
  "passed": true,
  "actualOutput": [{ "completed_payments": 3 }],
  "reason": null
}
```

#### Response Fail

```json
{
  "passed": false,
  "actualOutput": [{ "completed_payments": 3 }],
  "reason": "Row data mismatch"
}
```

#### Response Execution Error

```json
{
  "passed": false,
  "error": "syntax error near FROM",
  "actualOutput": null
}
```

---

### POST /reset

Resets the database for a given question back to its original seeded state.

This endpoint destroys the current database and removes all user mutations.

#### Request Body

```json
{
  "questionId": 1
}
```

#### Response

```json
{
  "success": true,
  "message": "Database reset successfully"
}
```

---

## SQL Constraints and Rules

- Only validated SQL is executed
- Dangerous commands such as ATTACH, PRAGMA modification, system access, and file operations are blocked
- Multiple SQL statements are allowed
- Results of all SELECT statements are captured in an `outputs` array (in execution order)
- The `output` field remains for backward compatibility and contains the last SELECT's result
- If no SELECT is present, `outputs` is an empty array and `output` is an empty array

---

## Output Semantics

- Column names are normalized to lowercase
- Column order is normalized
- Row order is normalized
- Numeric values are compared with tolerance for floating point precision
- NULL values are preserved

---

## JSON Request Constraints

- SQL code must be sent as a single-line string or with escaped newlines
- Raw multiline strings are not valid JSON and will be rejected by the server

Correct example:

```json
{
  "code": "SELECT * FROM employees;"
}
```

Incorrect example:

```json
{
  "code": "
    SELECT * FROM employees
  "
}
```

---

## Development Setup

1. Install dependencies

```bash
npm install
```

2. Start the server

```bash
npm run dev
```

3. Test APIs using Postman or curl

---
