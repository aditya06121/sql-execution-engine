import { SqliteExecutionEngine } from "../engine/SqliteExecutionEngine.js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const engines = new Map(); // key: `${questionId}:${groupId}` -> engine
const seedStore = new Map(); // key: groupId -> seedSql (global seed registry)

function keyFor(questionId, groupId) {
  const g =
    groupId === undefined || groupId === null ? "default" : String(groupId);
  return `${questionId}:${g}`;
}

// Create/store a seed for a group; auto-generate groupId if not provided
export function createSeed(groupId, seedSql) {
  const id = groupId ? String(groupId) : randomUUID();
  seedStore.set(id, seedSql);
  return id;
}

// Retrieve stored seed for a group
function getSeedForGroup(groupId) {
  return seedStore.get(groupId);
}

export function getEngine(questionId, groupId) {
  return engines.get(keyFor(questionId, groupId));
}

export function setEngine(questionId, groupId, engine) {
  engines.set(keyFor(questionId, groupId), engine);
}

export function removeEngine(questionId, groupId) {
  engines.delete(keyFor(questionId, groupId));
}

export async function createEngine(questionId, groupId) {
  const k = keyFor(questionId, groupId);

  // destroy existing if present
  const existing = engines.get(k);
  if (existing) {
    try {
      await existing.destroy();
    } catch (e) {
      // ignore
    }
    engines.delete(k);
  }

  // look up seed for this group; fall back to default if not found
  const normalizedGroupId =
    groupId === undefined || groupId === null ? "default" : String(groupId);
  let seedSql = getSeedForGroup(normalizedGroupId);
  if (!seedSql) {
    // fall back to baseline seed
    seedSql = fs.readFileSync(path.resolve("engine/seed.sql"), "utf8");
  }

  const engine = new SqliteExecutionEngine({ questionId, seedSql });
  await engine.init();
  engines.set(k, engine);
  return engine;
}
