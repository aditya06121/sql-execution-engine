import { validateSql } from "../validators/sqliteValidationService.js";
import { SqliteExecutionEngine } from "./SqliteExecutionEngine.js";
import fs from "fs";

const seedSql = fs.readFileSync("./seeds/question1.sql", "utf8");

const engine = new SqliteExecutionEngine({
  questionId: 1,
  seedSql,
});

await engine.init();

const { statements } = validateSql(`
  INSERT INTO users VALUES (2, 'Bob');
  SELECT * FROM users;
`);

const result = await engine.execute(statements);

console.log(result);
/*
{
  success: true,
  output: [ { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' } ],
  error: null
}
*/

await engine.destroy();
