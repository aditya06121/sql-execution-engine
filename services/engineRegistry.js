const engines = new Map(); // questionId → SqliteExecutionEngine

export function getEngine(questionId) {
  return engines.get(questionId);
}

export function setEngine(questionId, engine) {
  engines.set(questionId, engine);
}

export function removeEngine(questionId) {
  engines.delete(questionId);
}
