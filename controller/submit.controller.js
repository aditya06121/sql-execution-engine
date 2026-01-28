import { validateSql } from "../services/sqlValidationService.js";
import { SqliteExecutionEngine } from "../engine/SqliteExecutionEngine.js";
import { normalizeResult } from "../services/resultNormalizer.js";
import { compareResults } from "../services/resultComparator.js";
import {
  getEngine,
  setEngine,
  removeEngine,
} from "../services/engineRegistry.js";
import { BASE_SEED_SQL } from "../engine/loadSeed.js";

export const executeSql = async (req, res) => {
  try {
    const { questionId, code } = req.body;

    if (!questionId || !code) {
      return res
        .status(400)
        .json({ error: "questionId and code are required" });
    }

    // Validate SQL safety
    const { statements } = validateSql(code);

    // Get or create engine
    let engine = getEngine(questionId);
    if (!engine) {
      engine = new SqliteExecutionEngine({
        questionId,
        seedSql: BASE_SEED_SQL,
      });
      await engine.init();
      setEngine(questionId, engine);
    }

    // Execute SQL
    const result = await engine.execute(statements);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      output: normalizeResult(result.output),
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
    const { questionId, code, expectedOutput } = req.body;

    if (!questionId || !code || expectedOutput === undefined) {
      return res.status(400).json({
        error: "questionId, code, and expectedOutput are required",
      });
    }

    // Validate SQL safety
    const { statements } = validateSql(code);

    // Get or create engine
    let engine = getEngine(questionId);
    if (!engine) {
      engine = new SqliteExecutionEngine({
        questionId,
        seedSql: BASE_SEED_SQL,
      });
      await engine.init();
    }

    // Execute SQL
    const execution = await engine.execute(statements);

    // Always destroy engine on submit
    await engine.destroy();
    removeEngine(questionId);

    if (!execution.success) {
      return res.status(200).json({
        passed: false,
        error: execution.error,
        actualOutput: null,
      });
    }

    const normalizedActual = normalizeResult(execution.output);
    const comparison = compareResults(expectedOutput, normalizedActual);

    return res.status(200).json({
      passed: comparison.passed,
      reason: comparison.reason ?? null,
      actualOutput: normalizedActual,
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
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: "questionId is required" });
    }

    const engine = getEngine(questionId);

    if (engine) {
      await engine.destroy();
      removeEngine(questionId);
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
