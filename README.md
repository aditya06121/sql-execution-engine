# SQL Execution Engine

A Node.js + Express microservice that runs user SQL against isolated SQLite databases, supports custom seed datasets, and compares query results for grading/evaluation workflows.

## What This Service Does

- Executes SQL safely (with validation and basic guardrails).
- Isolates database state per `(questionId, groupId)`.
- Supports custom dataset seeding via `groupId`.
- Returns normalized query output for deterministic comparisons.
- Compares actual vs expected output for submissions.

## Tech Stack

- Node.js (ES modules)
- Express 5
- SQLite via `better-sqlite3`
- Docker (containerized runtime)
- GitHub Actions (build + deploy workflow)

## Project Structure

```text
.
|- app.js                         # Express app config + router mounting
|- index.js                       # Server bootstrap
|- routes/
|  \- submit.routes.js            # API route definitions
|- controller/
|  \- submit.controller.js        # Endpoint handlers and orchestration
|- services/
|  |- sqlValidationService.js     # SQL input validation and blocking rules
|  |- engineRegistry.js           # In-memory engine + seed registry
|  |- resultNormalizer.js         # Deterministic result normalization
|  \- resultComparator.js         # Expected vs actual comparison logic
|- engine/
|  |- SqliteExecutionEngine.js    # SQLite file lifecycle + statement execution
|  |- seed.sql                    # Baseline schema/data
|  \- loadSeed.js                 # Loads baseline seed SQL
|- Dockerfile
|- .github/workflows/deployment.yml
\- api_doc.md                     # Detailed API examples/reference
```

## Architecture Overview

### Core components

1. `Express App` receives JSON requests under `/api/*`.
2. `Controller` validates input and orchestrates execution flow.
3. `SQL Validation Service` blocks disallowed patterns and enforces limits.
4. `Engine Registry` provides per-key engine instances:
   - key format: ``${questionId}:${groupId || "default"}``
5. `SQLite Execution Engine` creates a temp SQLite DB file, seeds it, executes SQL, and cleans up.
6. `Result Normalizer` and `Result Comparator` produce stable grading outputs.

### Runtime model

- Engines are stored in-memory (`Map`) and are process-local.
- Seed SQL is stored in-memory (`Map`) by `groupId`.
- Each engine uses a temporary DB file under `tmp/`.
- DB file naming: `question_<questionId>_<uuid>.db`.
- `/api/submit` destroys the engine after grading.
- `/api/reset` destroys the engine on demand.

## Data Flow

### 1) `POST /api/execute`

1. Validate required body: `questionId`, `code`.
2. Run `validateSql(code)`:
   - reject unsafe patterns
   - enforce max SQL length and statement count
   - split into statements by `;`
3. Resolve engine via `(questionId, groupId)`:
   - reuse existing engine, or
   - create a new engine seeded from:
     - custom `seedSql` for `groupId`, else
     - fallback `engine/seed.sql`
4. Execute statements sequentially:
   - `SELECT`/`WITH` -> capture rows
   - non-SELECT -> `exec`
5. Normalize output:
   - `output`: normalized last `SELECT` result
   - `outputs`: normalized results for all `SELECT`s
6. Return response.

### 2) `POST /api/submit`

Same as `/api/execute`, then:

1. Normalize actual output.
2. Normalize expected output (array or JSON string).
3. Compare row count + row data.
4. Return `passed` result.
5. Destroy engine and remove it from registry (always finalizes that key).

### 3) `POST /api/seed`

1. Validate `seedSql` exists and is a string.
2. Generate `groupId` (UUID).
3. Store `groupId -> seedSql` in memory.
4. Return `groupId`.

Note: this endpoint stores seed SQL only; it does not create a DB immediately.

### 4) `POST /api/schema`

1. Accept optional `questionId` and `groupId`.
2. Resolve engine key using:
   - `questionId` if provided
   - otherwise `"default"`
3. Create engine if missing.
4. Query `sqlite_master` + `PRAGMA table_info` + `SELECT *` per table.
5. Return table names, column metadata, and full table data.

### 5) `POST /api/reset`

1. Validate required `questionId`.
2. Resolve engine by `(questionId, groupId)`.
3. If found, destroy engine and remove from registry.
4. Return success message.

## API Endpoints

Base URL (local): `http://localhost:6060/api`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/seed` | Register a custom seed dataset and return `groupId` |
| POST | `/schema` | Inspect schema and data for a question/group context |
| POST | `/execute` | Execute SQL and return normalized result |
| POST | `/submit` | Execute SQL, compare against expected output, and finalize |
| POST | `/reset` | Destroy and reset DB state for a question/group |

### `POST /api/seed`

Request body:

```json
{
  "seedSql": "CREATE TABLE t(id INTEGER); INSERT INTO t VALUES (1);"
}
```

Success (`201`):

```json
{
  "groupId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `POST /api/schema`

Request body (all optional):

```json
{
  "questionId": 1,
  "groupId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Success (`200`) returns:
- `questionId`
- `groupId`
- `schema[]` with:
  - `table`
  - `columns[]` (`name`, `type`)
  - `data[]`

### `POST /api/execute`

Request body:

```json
{
  "questionId": 1,
  "groupId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "SELECT * FROM employees;"
}
```

Success (`200`):

```json
{
  "success": true,
  "output": [{ "id": 1, "name": "Alice" }],
  "outputs": [[{ "id": 1, "name": "Alice" }]]
}
```

Execution failure (`200`) example:

```json
{
  "success": false,
  "error": "no such table: abc"
}
```

### `POST /api/submit`

Request body:

```json
{
  "questionId": 1,
  "groupId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "SELECT COUNT(*) AS cnt FROM employees;",
  "expectedOutput": [{ "cnt": 6 }]
}
```

Success (`200`) response:

```json
{
  "passed": true,
  "reason": null,
  "actualOutput": [{ "cnt": 6 }],
  "actualOutputs": [[{ "cnt": 6 }]]
}
```

### `POST /api/reset`

Request body:

```json
{
  "questionId": 1,
  "groupId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Success (`200`):

```json
{
  "success": true,
  "message": "Database reset successfully"
}
```

## SQL Safety Rules

Validation blocks these patterns:

- `ATTACH DATABASE`, `DETACH DATABASE`
- `PRAGMA`
- `CREATE VIRTUAL TABLE`
- `WITH RECURSIVE`
- `INTO OUTFILE`
- `COPY`

Limits:

- Max SQL length: `10,000` chars
- Max statements per request: `20`

Important: validation errors are currently surfaced by controller catch blocks as `500` responses with `details`.

## Result Normalization & Comparison

Normalization behavior:

- Non-array results become `[]`.
- Column names:
  - trimmed
  - lowercased
  - spaces -> `_`
  - non-word chars removed
- Numeric values:
  - integers unchanged
  - floats rounded to 6 decimals
- String values trimmed
- Rows sorted deterministically

Comparison behavior (`/submit`):

- Compares normalized expected vs normalized actual.
- Fails on row-count mismatch.
- Fails on row data mismatch.
- Uses float tolerance of `1e-6`.

## Baseline Seed Dataset

Default seed comes from `engine/seed.sql` and includes these tables:

- `departments`
- `employees`
- `customers`
- `products`
- `orders`
- `order_items`
- `payments`

If no custom `groupId` seed is found, this baseline seed is used.

## Dependencies

### Runtime dependencies

| Package | Why it is used |
| --- | --- |
| `express` | HTTP API server and routing |
| `better-sqlite3` | SQLite engine (sync API, local DB files) |
| `dotenv` | Loads environment variables (`PORT`) |
| `path` | Declared in `package.json` (Node has built-in `path` module) |
| `sqlite` | Declared in `package.json`, currently not used in code paths |

### Dev dependencies

| Package | Why it is used |
| --- | --- |
| `nodemon` | Auto-restart in local development |

### Node built-ins used directly

- `fs`
- `path`
- `crypto`
- `url`

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `6060` | HTTP server port |

## Local Development

```bash
npm install
npm run dev
```

Server starts on:

`http://localhost:6060`

Quick health check (example endpoint call):

```bash
curl -X POST http://localhost:6060/api/execute \
  -H "Content-Type: application/json" \
  -d '{"questionId":1,"code":"SELECT 1 AS ok;"}'
```

## Docker

Build image:

```bash
docker build -t sql-execution-engine .
```

Run container:

```bash
docker run -d -p 6060:6060 --name sql-execution-engine sql-execution-engine
```

## CI/CD Workflow

Defined in `.github/workflows/deployment.yml`:

1. On push to `main`:
   - Checkout code
   - Build Docker image
   - Push image: `gisul/sql-execution-engine:latest`
2. Deploy job (self-hosted runner):
   - Pull latest image
   - Stop/remove existing `sql-execution-engine` container if present
   - Run new container on `6060:6060` with restart policy

## Operational Notes

- Engines and seed registry are in-memory and reset on service restart.
- `/api/schema` may create and keep an engine alive if one does not exist.
- `/api/submit` always destroys the engine for that key after grading.
- Temporary DB artifacts are cleaned up on `destroy()` (`.db`, `-wal`, `-shm`).

## Scripts

```json
{
  "start": "node index.js",
  "dev": "nodemon index.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

## Additional Reference

For expanded examples and payloads, see `api_doc.md`.
