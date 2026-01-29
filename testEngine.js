import fs from "fs";
import path from "path";
import { SqliteExecutionEngine } from "./engine/SqliteExecutionEngine.js";

// Load seed SQL
const seedSql = fs.readFileSync(
  path.join(process.cwd(), "engine", "seed.sql"),
  "utf8",
);

async function runTest() {
  console.log("🔹 Creating engine...");
  const engine = new SqliteExecutionEngine({
    questionId: 1,
    seedSql,
  });

  await engine.init();
  console.log("✅ Engine initialized");

  console.log("\n🔹 Test 1: Seed data exists");
  let result = await engine.execute(["SELECT COUNT(*) AS cnt FROM employees"]);
  console.log(result);

  console.log("\n🔹 Test 2: Sticky DB (insert + reselect)");
  await engine.execute([
    "INSERT INTO employees VALUES (99, 'TestUser', 'test@corp.com', 1, 75000, '2024-01-01')",
  ]);

  result = await engine.execute(["SELECT COUNT(*) AS cnt FROM employees"]);
  console.log(result);

  console.log("\n🔹 Test 3: Capture all SELECT results");
  result = await engine.execute([
    "SELECT name FROM employees WHERE id = 1",
    "SELECT name FROM employees WHERE id = 2",
  ]);
  console.log(result);

  console.log("\n🔹 Test 4: Invalid SQL");
  result = await engine.execute(["SELECT * FROM table_does_not_exist"]);
  console.log(result);

  console.log("\n🔹 Destroying engine...");
  await engine.destroy();
  console.log("✅ Engine destroyed");
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
});
