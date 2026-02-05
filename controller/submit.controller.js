import { validateSql } from "../services/sqlValidationService.js";
import { normalizeResult } from "../services/resultNormalizer.js";
import { compareResults } from "../services/resultComparator.js";
import {
  getEngine,
  removeEngine,
  createEngine,
  createSeed,
} from "../services/engineRegistry.js";
import { BASE_SEED_SQL } from "../engine/loadSeed.js";

export const executeSql = async (req, res) => {
  try {
    const { questionId, code, groupId } = req.body;

    if (!questionId || !code) {
      return res
        .status(400)
        .json({ error: "questionId and code are required" });
    }

    // Validate SQL safety
    const { statements } = validateSql(code);

    // Get or create engine (per questionId+groupId)
    let engine = getEngine(questionId, groupId);
    if (!engine) {
      engine = await createEngine(questionId, groupId, BASE_SEED_SQL);
      // createEngine stores the engine in registry
    }

    // Execute SQL
    const result = await engine.execute(statements);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error,
      });
    }

    // Normalize last output for compatibility
    const normalizedOutput = normalizeResult(result.output);

    // Normalize all outputs (if any) so clients can inspect every SELECT
    const normalizedOutputs = (result.outputs || []).map((r) =>
      normalizeResult(r),
    );

    return res.status(200).json({
      success: true,
      output: normalizedOutput,
      outputs: normalizedOutputs,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Execution failed",
      details: err.message,
    });
  }
};

export const submitSql = async (req, res) => {
  try {
    const { questionId, code, expectedOutput, groupId } = req.body;

    if (!questionId || !code || expectedOutput === undefined) {
      return res.status(400).json({
        error: "questionId, code, and expectedOutput are required",
      });
    }

    // Validate SQL safety
    const { statements } = validateSql(code);

    // Get or create engine (per questionId+groupId)
    let engine = getEngine(questionId, groupId);
    if (!engine) {
      engine = await createEngine(questionId, groupId, BASE_SEED_SQL);
    }

    // Execute SQL
    const execution = await engine.execute(statements);

    // Always destroy engine on submit (per questionId+groupId)
    await engine.destroy();
    removeEngine(questionId, groupId);

    if (!execution.success) {
      return res.status(200).json({
        passed: false,
        error: execution.error,
        actualOutput: null,
      });
    }

    const normalizedActual = normalizeResult(execution.output);
    const comparison = compareResults(expectedOutput, normalizedActual);

    // Also include all outputs for inspection
    const normalizedOutputs = (execution.outputs || []).map((r) =>
      normalizeResult(r),
    );

    return res.status(200).json({
      passed: comparison.passed,
      reason: comparison.reason ?? null,
      actualOutput: normalizedActual,
      actualOutputs: normalizedOutputs,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Submission failed",
      details: err.message,
    });
  }
};

export const resetQuestion = async (req, res) => {
  try {
    const { questionId, groupId } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: "questionId is required" });
    }

    const engine = getEngine(questionId, groupId);

    if (engine) {
      await engine.destroy();
      removeEngine(questionId, groupId);
    }

    return res.status(200).json({
      success: true,
      message: "Database reset successfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: "Reset failed",
      details: err.message,
    });
  }
};

export const seedGroup = async (req, res) => {
  try {
    const { seedSql } = req.body;

    if (!seedSql || typeof seedSql !== "string") {
      return res.status(400).json({ error: "seedSql (string) is required" });
    }

    // store the seed SQL globally with an auto-generated groupId
    const groupId = await createSeed(undefined, seedSql);

    return res.status(201).json({ groupId });
  } catch (err) {
    return res.status(500).json({ error: "Seed failed", details: err.message });
  }
};

export const getSchema = async (req, res) => {
  try {
    const { questionId, groupId } = req.body;

    // Get or create engine
    // If questionId is not provided, use a default identifier
    const qId = questionId || "default";
    let engine = getEngine(qId, groupId);
    if (!engine) {
      engine = await createEngine(qId, groupId);
    }

    // Get schema from sqlite_master
    const tables = engine.db
      .prepare(
        "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all();

    // For each table, get column info and all data
    const schema = tables.map((tableRow) => {
      // Get column information (name, type)
      const pragmaInfo = engine.db
        .prepare(`PRAGMA table_info(${tableRow.name})`)
        .all();

      const columns = pragmaInfo.map((col) => ({
        name: col.name,
        type: col.type,
      }));

      // Get all data
      const data = engine.db.prepare(`SELECT * FROM ${tableRow.name}`).all();

      return {
        table: tableRow.name,
        columns,
        data,
      };
    });

    return res.status(200).json({
      questionId: questionId || null,
      groupId: groupId || "default",
      schema,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Schema retrieval failed",
      details: err.message,
    });
  }
};
