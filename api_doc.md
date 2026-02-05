# API Documentation

Comprehensive documentation for all available API endpoints.

---

## Table of Contents

1. [Overview](#overview)
2. [Common Response Patterns](#common-response-patterns)
3. [Endpoints](#endpoints)
   - [POST /api/seed](#post-apiseed)
   - [POST /api/schema](#post-apischema)
   - [POST /api/execute](#post-apiexecute)
   - [POST /api/submit](#post-apisubmit)
   - [POST /api/reset](#post-apireset)

---

## Overview

The SQL Execution Engine API provides a RESTful interface for executing and evaluating SQL queries against managed, isolated databases. Each request is scoped to a specific `questionId` and optional `groupId`, enabling:

- **Multiple seeded datasets** per question via custom groups
- **Safe SQL execution** with validation to block dangerous operations
- **Result comparison** for automatic grading
- **Schema introspection** to help users understand available tables
- **Database isolation** — each `(questionId, groupId)` pair gets its own temporary SQLite instance

All requests must include `Content-Type: application/json` header.

---

## Common Response Patterns

### Success Response (HTTP 2xx)

Successful requests return a JSON object with relevant data:

```json
{
  "success": true,
  "data": {}
}
```

### Error Response (HTTP 4xx/5xx)

Errors include a descriptive message and optional details:

```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

### HTTP Status Codes

- **200 OK** — Successful execution (for execute, submit queries)
- **201 Created** — Resource created (for seed creation)
- **400 Bad Request** — Missing or invalid request parameters
- **500 Internal Server Error** — Server-side execution failure

---

## Endpoints

---

### POST /api/seed

**Purpose:** Create a new seeded dataset variant and return an auto-generated `groupId`.

**URL:** `http://localhost:3000/api/seed`

**Method:** `POST`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "seedSql": "CREATE TABLE employees(id INTEGER, name TEXT); INSERT INTO employees VALUES (1, 'Alice');"
}
```

**Parameters:**

| Field     | Type   | Required | Description                                                                                                     |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| `seedSql` | string | Yes      | DDL and INSERT statements to initialize the database. Can be multi-statement and contain newlines. Maximum 5MB. |

#### Response

**Status:** `201 Created`

```json
{
  "groupId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields:**

| Field     | Type   | Description                                                                               |
| --------- | ------ | ----------------------------------------------------------------------------------------- |
| `groupId` | string | Backend-generated UUID. Use this to reference the seeded variant in subsequent API calls. |

#### Error Responses

**Missing seedSql (HTTP 400):**

```json
{
  "error": "seedSql (string) is required"
}
```

**Server Error (HTTP 500):**

```json
{
  "error": "Seed failed",
  "details": "Error details from SQL execution or file system"
}
```

#### Examples

**Simple inline seed:**

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"seedSql":"CREATE TABLE x(id INTEGER); INSERT INTO x VALUES (1),(2);"}'
```

**Response:**

```json
{
  "groupId": "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"
}
```

**Seed from file using jq:**

```bash
jq -Rs -n '{seedSql:input}' < engine/seed.sql | \
  curl -X POST http://localhost:3000/api/seed \
    -H "Content-Type: application/json" -d @-
```

**Capture groupId in shell:**

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"seedSql":"CREATE TABLE employees(id INT, name TEXT);"}')

GROUP_ID=$(echo $RESPONSE | jq -r '.groupId')
echo "Seeded with groupId: $GROUP_ID"
```

#### Notes

- The backend auto-generates a UUID if `groupId` is not provided (and it isn't in this endpoint).
- The generated `groupId` is returned immediately in the response.
- Multiple questions can reuse the same `groupId` (shared dataset).
- The `seedSql` is executed as-is; only provide trusted SQL or add server-side validation.
- Maximum payload size is 5MB (configurable via `express.json({ limit })` in `app.js`).

---

### POST /api/schema

**Purpose:** Retrieve the database schema (table structure with column types and all data) for an optional `questionId` and optional `groupId`. This endpoint allows users and admins to inspect the complete database structure before executing queries. No specific question state is required.

**URL:** `http://localhost:3000/api/schema`

**Method:** `POST`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "groupId": "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"
}
```

**Parameters:**

| Field        | Type             | Required | Description                                                                                           |
| ------------ | ---------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `questionId` | number \| string | No       | If provided, scopes the schema to that question. If omitted, uses a default engine.                   |
| `groupId`    | string           | No       | If provided, returns schema for that seeded variant. If omitted, returns schema for the default seed. |

#### Response

**Status:** `200 OK`

```json
{
  "questionId": null,
  "groupId": "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c",
  "schema": [
    {
      "table": "employees",
      "columns": [
        { "name": "id", "type": "INTEGER" },
        { "name": "name", "type": "TEXT" }
      ],
      "data": [
        { "id": 1, "name": "Alice" },
        { "id": 2, "name": "Bob" }
      ]
    },
    {
      "table": "departments",
      "columns": [
        { "name": "id", "type": "INTEGER" },
        { "name": "name", "type": "TEXT" }
      ],
      "data": [
        { "id": 1, "name": "Engineering" },
        { "id": 2, "name": "Sales" }
      ]
    }
  ]
}
```

**Response Fields:**

| Field                     | Type                     | Description                                                   |
| ------------------------- | ------------------------ | ------------------------------------------------------------- |
| `questionId`              | number \| string \| null | The question ID from the request (or `null` if not provided). |
| `groupId`                 | string                   | The group ID used (provided or "default").                    |
| `schema`                  | array                    | Array of table definitions with columns and data.             |
| `schema[].table`          | string                   | Table name.                                                   |
| `schema[].columns`        | array                    | Array of column objects with name and type information.       |
| `schema[].columns[].name` | string                   | Column name.                                                  |
| `schema[].columns[].type` | string                   | Column data type (e.g., INTEGER, TEXT, REAL).                 |
| `schema[].data`           | array                    | Array of all rows in the table as objects.                    |

#### Error Responses

**Server Error (HTTP 500):**

```json
{
  "error": "Schema retrieval failed",
  "details": "Error details from database query"
}
```

#### Examples

**Get default seed schema without questionId (admin view):**

```bash
curl -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Get default seed schema with questionId:**

```bash
curl -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d '{"questionId":1}'
```

**Get schema for a specific seeded variant:**

```bash
curl -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d '{"groupId":"a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"}'
```

**Parse and display table columns and data in shell:**

```bash
curl -s -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.schema[] | {table: .table, columns: .columns, rowCount: (.data | length)}'
```

**Display all data for a specific table:**

```bash
curl -s -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.schema[] | select(.table == "employees") | .data'
```

#### Notes

- `questionId` is now **optional** — admins can inspect the database without specifying a question.
- The response includes **table definitions with column types and all actual data**.
- Column types are retrieved from SQLite's `PRAGMA table_info()`.
- If `groupId` is provided but no seeded variant exists for that group, the server lazily creates an engine using the baseline seed and returns its schema and data.
- This endpoint does not modify the database; it is read-only and safe to call multiple times.
- Use this endpoint to help users understand the data structure and content before writing queries, or for admins to inspect the available datasets.
- This endpoint does not modify the database; it is read-only and safe to call multiple times.
- Use this endpoint to help users understand the data structure and content before writing queries.
- For large tables, the response may be large; consider paginating if needed in future versions.

---

### POST /api/execute

**Purpose:** Execute SQL against a question-scoped database and return outputs (for iterative testing).

**URL:** `http://localhost:3000/api/execute`

**Method:** `POST`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "questionId": 1,
  "code": "SELECT * FROM employees;",
  "groupId": "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"
}
```

**Parameters:**

| Field        | Type             | Required | Description                                                                      |
| ------------ | ---------------- | -------- | -------------------------------------------------------------------------------- |
| `questionId` | number \| string | Yes      | Identifies the question.                                                         |
| `code`       | string           | Yes      | SQL code to execute. Can contain multiple statements.                            |
| `groupId`    | string           | No       | If provided, runs against the seeded variant. If omitted, uses the default seed. |

#### Response

**Status:** `200 OK` (on success or SQL error)

**Success Response:**

```json
{
  "success": true,
  "output": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "outputs": [
    [
      { "id": 1, "name": "Alice" },
      { "id": 2, "name": "Bob" }
    ]
  ]
}
```

**Response Fields (Success):**

| Field     | Type            | Description                                                       |
| --------- | --------------- | ----------------------------------------------------------------- |
| `success` | boolean         | `true` on successful execution.                                   |
| `output`  | array           | Result of the last SELECT statement (for backward compatibility). |
| `outputs` | array of arrays | All SELECT statement results in execution order.                  |

**SQL Error Response:**

```json
{
  "success": false,
  "error": "no such table: foo"
}
```

**Response Fields (Error):**

| Field     | Type    | Description                       |
| --------- | ------- | --------------------------------- |
| `success` | boolean | `false` when SQL execution fails. |
| `error`   | string  | Error message from SQLite.        |

#### Error Responses

**Missing required fields (HTTP 400):**

```json
{
  "error": "questionId and code are required"
}
```

**Server Error (HTTP 500):**

```json
{
  "error": "Execution failed",
  "details": "Error details"
}
```

#### Examples

**Execute against default seed:**

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"code":"SELECT * FROM employees;"}'
```

**Execute against custom seeded variant:**

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"groupId":"a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c","code":"SELECT COUNT(*) as cnt FROM employees;"}'
```

**Iterative testing with jq parsing:**

```bash
curl -s -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"code":"SELECT * FROM employees;"}' | jq '.output'
```

#### Behavior with groupId

- If `groupId` is provided and a seeded engine exists for `(questionId, groupId)`, the query runs against that custom-seeded database.
- If `groupId` is provided but no seeded engine exists, the server lazily creates one using the baseline seed.
- If `groupId` is omitted, the query runs against `questionId:default` using the baseline seed.
- This endpoint does **not** destroy the engine after execution; use `/api/submit` or `/api/reset` to destroy.

#### SQL Validation

- The `code` is validated by `sqlValidationService.js` before execution.
- The following statements are blocked: `ATTACH`, `PRAGMA` modifications, file operations (`COPY`, `LOAD`).
- Other DDL (CREATE, INSERT, UPDATE, DELETE) and DML (SELECT) are allowed.

#### Notes

- Multiple SELECT statements are supported; `output` contains the last result, `outputs` contains all results.
- Results are normalized: column names lowercased, floating-point tolerances applied.
- The engine persists in memory until destroyed (via `/api/submit` or `/api/reset`).
- Safe for iterative testing and development.

---

### POST /api/submit

**Purpose:** Execute SQL, compare result to an expected output, and destroy the engine for that `(questionId, groupId)` pair (final submission/grade).

**URL:** `http://localhost:3000/api/submit`

**Method:** `POST`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "questionId": 1,
  "code": "SELECT COUNT(*) as cnt FROM employees;",
  "expectedOutput": [{ "cnt": 2 }],
  "groupId": "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"
}
```

**Parameters:**

| Field            | Type             | Required | Description                                                                      |
| ---------------- | ---------------- | -------- | -------------------------------------------------------------------------------- |
| `questionId`     | number \| string | Yes      | Identifies the question.                                                         |
| `code`           | string           | Yes      | SQL code to execute.                                                             |
| `expectedOutput` | array            | Yes      | Expected normalized result as array of row objects.                              |
| `groupId`        | string           | No       | If provided, runs against the seeded variant. If omitted, uses the default seed. |

#### Response

**Status:** `200 OK` (on success, failure, or SQL error)

**Success (Passed) Response:**

```json
{
  "passed": true,
  "reason": null,
  "actualOutput": [{ "cnt": 2 }],
  "actualOutputs": [[{ "cnt": 2 }]]
}
```

**Failure (Did Not Pass) Response:**

```json
{
  "passed": false,
  "reason": "Row data mismatch",
  "actualOutput": [{ "cnt": 3 }],
  "actualOutputs": [[{ "cnt": 3 }]]
}
```

**SQL Error Response:**

```json
{
  "passed": false,
  "error": "syntax error near FROM",
  "actualOutput": null,
  "actualOutputs": null
}
```

**Response Fields:**

| Field           | Type                    | Description                                                                              |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `passed`        | boolean                 | `true` if actual output matches expected output.                                         |
| `reason`        | string \| null          | Reason for failure (e.g., "Row data mismatch", "Column count mismatch"). `null` on pass. |
| `error`         | string                  | Error message from SQLite (only present on SQL error).                                   |
| `actualOutput`  | array \| null           | The actual normalized result of the last SELECT. `null` on SQL error.                    |
| `actualOutputs` | array of arrays \| null | All SELECT results in execution order. `null` on SQL error.                              |

#### Error Responses

**Missing required fields (HTTP 400):**

```json
{
  "error": "questionId, code, and expectedOutput are required"
}
```

**Server Error (HTTP 500):**

```json
{
  "error": "Submission failed",
  "details": "Error details"
}
```

#### Examples

**Submit against default seed:**

```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"code":"SELECT COUNT(*) as cnt FROM employees;","expectedOutput":[{"cnt":2}]}'
```

**Submit against custom seeded variant:**

```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"groupId":"a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c","code":"SELECT * FROM employees;","expectedOutput":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}'
```

**Parse pass/fail in shell:**

```bash
RESULT=$(curl -s -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"code":"SELECT * FROM employees;","expectedOutput":[{"id":1,"name":"Alice"}]}')

PASSED=$(echo $RESULT | jq '.passed')
if [ "$PASSED" = "true" ]; then
  echo "Test passed!"
else
  echo "Test failed: $(echo $RESULT | jq '.reason')"
fi
```

#### Comparison Logic

- The actual result is normalized and compared to the expected output.
- Normalization includes: lowercase column names, canonical row ordering, floating-point tolerance.
- The comparator tolerates small floating-point differences (e.g., 1.0000001 ≈ 1.0).
- Comparison is strict for text and integer values.

#### Important Notes

- **Engine Destruction:** After evaluation, the engine for `(questionId, groupId)` is **destroyed** and removed from the registry.
- **Database Cleanup:** The temporary SQLite file is deleted.
- **Subsequent Requests:** If you call `/api/execute` or `/api/submit` again with the same `(questionId, groupId)`, a fresh engine will be created.
- **Preservation:** To preserve the engine for further work, use `/api/execute` only (multiple times) and call `/api/submit` only when ready to finalize.

#### Expected Output Format

- `expectedOutput` must be an array of row objects.
- Each row is a JSON object with lowercase column names as keys.
- Example:

```json
[
  { "id": 1, "name": "Alice" },
  { "id": 2, "name": "Bob" }
]
```

---

### POST /api/reset

**Purpose:** Reset (destroy) the engine for a given `questionId` and optional `groupId`. This removes any mutations and the temporary database file.

**URL:** `http://localhost:3000/api/reset`

**Method:** `POST`

**Content-Type:** `application/json`

#### Request Body

```json
{
  "questionId": 1,
  "groupId": "a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"
}
```

**Parameters:**

| Field        | Type             | Required | Description                                                                                       |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `questionId` | number \| string | Yes      | Identifies the question.                                                                          |
| `groupId`    | string           | No       | If provided, resets that variant. If omitted, resets the default baseline (`questionId:default`). |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "Database reset successfully"
}
```

**Response Fields:**

| Field     | Type    | Description                        |
| --------- | ------- | ---------------------------------- |
| `success` | boolean | Always `true` on successful reset. |
| `message` | string  | Confirmation message.              |

#### Error Responses

**Missing questionId (HTTP 400):**

```json
{
  "error": "questionId is required"
}
```

**Server Error (HTTP 500):**

```json
{
  "error": "Reset failed",
  "details": "Error details"
}
```

#### Examples

**Reset default engine for a question:**

```bash
curl -X POST http://localhost:3000/api/reset \
  -H "Content-Type: application/json" \
  -d '{"questionId":1}'
```

**Reset a specific seeded variant:**

```bash
curl -X POST http://localhost:3000/api/reset \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"groupId":"a1b2c3d4-e5f6-47a8-9b1c-2d3e4f5a6b7c"}'
```

#### Behavior

- If the engine exists for `(questionId, groupId)`, it is destroyed and removed from the registry.
- If the engine does not exist, the reset succeeds silently (idempotent operation).
- After reset, the temporary database file is deleted.
- Subsequent `/api/execute` or `/api/submit` requests will create a fresh engine.

#### Use Cases

- Clean up after testing to start with a fresh database.
- Free memory and file resources during long test sessions.
- Revert database mutations (all changes are lost; the database is recreated on next request).

---

## Full Workflow Example

### Step 1: Create a seeded dataset

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"seedSql":"CREATE TABLE employees(id INTEGER, name TEXT); INSERT INTO employees VALUES (1,'\''Alice'\''),(2,'\''Bob'\'');"}')

GROUP_ID=$(echo $RESPONSE | jq -r '.groupId')
echo "Created seed with groupId: $GROUP_ID"
```

### Step 2: Inspect the schema

```bash
curl -X POST http://localhost:3000/api/schema \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":1,\"groupId\":\"$GROUP_ID\"}"
```

### Step 3: Test queries iteratively

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":1,\"groupId\":\"$GROUP_ID\",\"code\":\"SELECT * FROM employees;\"}"
```

### Step 4: Submit the final solution

```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":1,\"groupId\":\"$GROUP_ID\",\"code\":\"SELECT COUNT(*) as cnt FROM employees;\",\"expectedOutput\":[{\"cnt\":2}]}"
```

### Step 5: (Optional) Reset the engine

```bash
curl -X POST http://localhost:3000/api/reset \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":1,\"groupId\":\"$GROUP_ID\"}"
```

---

## Multi-Question Workflow with Same groupId

You can reuse a seeded dataset (`groupId`) across multiple questions:

```bash
# Create seed once
RESPONSE=$(curl -s -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"seedSql":"CREATE TABLE sales(id INTEGER, amount REAL); INSERT INTO sales VALUES (1,100.5),(2,250.75);"}')

GROUP_ID=$(echo $RESPONSE | jq -r '.groupId')

# Question 1: Count total sales
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":1,\"code\":\"SELECT COUNT(*) as cnt FROM sales;\",\"expectedOutput\":[{\"cnt\":2}],\"groupId\":\"$GROUP_ID\"}"

# Question 2: Sum sales (reusing same GROUP_ID)
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":2,\"code\":\"SELECT SUM(amount) as total FROM sales;\",\"expectedOutput\":[{\"total\":351.25}],\"groupId\":\"$GROUP_ID\"}"

# Question 3: Average sales (still reusing same GROUP_ID)
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":3,\"code\":\"SELECT AVG(amount) as avg FROM sales;\",\"expectedOutput\":[{\"avg\":175.625}],\"groupId\":\"$GROUP_ID\"}"
```

---

## Security & Safety

### SQL Validation

- All SQL in `/api/execute` and `/api/submit` is validated by `sqlValidationService.js`.
- Dangerous statements are blocked: `ATTACH`, `PRAGMA` modifications, and file operations.
- `/api/seed` executes `seedSql` without validation; only provide trusted SQL or add server-side validation.

### Database Isolation

- Each `(questionId, groupId)` pair has its own isolated temporary SQLite database.
- Changes in one pair do not affect others.
- Databases are stored in the `tmp/` directory and cleaned up after destruction.

### Result Normalization

- Results are automatically normalized to ensure consistent comparison.
- Column names are lowercased, rows are canonically ordered, and floating-point tolerances are applied.
- This prevents false negatives due to formatting differences.

---

## Configuration & Limits

### JSON Payload Size

- Default limit: **5MB**
- Configured in `app.js`: `express.json({ limit: "5mb" })`
- Increase if your `seedSql` payloads exceed 5MB:

```javascript
app.use(express.json({ limit: "50mb" })); // Example: 50MB
```

### Database Cleanup

- Temporary SQLite files are created in the `tmp/` directory.
- They are automatically deleted after `/api/submit`, `/api/reset`, or when replaced by a new seed.
- If the server crashes, manually clean up `tmp/*.db` files.

---

## Error Handling

### Common Error Scenarios

**Missing Parameters:**

```json
{ "error": "questionId and code are required" }
```

**Invalid SQL:**

```json
{
  "success": false,
  "error": "syntax error near FROM"
}
```

**Forbidden SQL Operations:**

```json
{
  "success": false,
  "error": "Dangerous SQL operation blocked"
}
```

**Server Issues:**

```json
{
  "error": "Execution failed",
  "details": "Detailed error message"
}
```

### Best Practices

- Always check the `success` or `passed` fields in responses.
- Log error details for debugging.
- Validate user input before sending to the server.
- Handle network timeouts gracefully.

---

## Rate Limiting & Performance

- No built-in rate limiting is currently implemented.
- Consider adding rate limiting if the service is exposed publicly.
- Database operations are fast for small datasets; performance may degrade with large seeds or complex queries.

---

## Testing Tools

### Using cURL

All examples in this documentation use cURL and can be run from the command line.

### Using Postman

Import the API documentation and create requests manually or use the JSON body examples provided.

### Using Node.js

```javascript
const axios = require("axios");

const response = await axios.post("http://localhost:3000/api/execute", {
  questionId: 1,
  code: "SELECT * FROM employees;",
});

console.log(response.data);
```

---

## Contact & Support

For issues or feature requests, refer to the project repository or contact the development team.
