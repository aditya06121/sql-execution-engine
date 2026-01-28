# sql-execution-engine

a backend microservice designed to run and evaluate sql commands

what we are building-

A stateless SQL execution microservice that:

1. Accepts SQL via HTTP POST (validation of sql before execution to stop any malpractice)

2. Executes SQL against a sandboxed database

3. Compares result with expected output

4. Returns true / false (+ optional result)

5. Runs inside Docker (Scales horizontally)
