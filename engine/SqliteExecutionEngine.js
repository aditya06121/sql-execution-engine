// engine/SqliteExecutionEngine.js

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import crypto from "crypto";

export class SqliteExecutionEngine {
  constructor({ questionId, seedSql }) {
    this.questionId = questionId;
    this.seedSql = seedSql;

    this.db = null;
    this.dbPath = null;
    this.lastSelectResult = null;
    this.active = false;
  }

  /**
   * Initialize the engine:
   * - create sqlite db file
   * - open connection
   * - apply safe pragmas
   * - seed base schema/data
   */
  async init() {
    if (this.active) {
      throw new Error("Engine already initialized");
    }

    const id = crypto.randomUUID();
    const dir = path.join(process.cwd(), "tmp");
    const fileName = `question_${this.questionId}_${id}.db`;

    fs.mkdirSync(dir, { recursive: true });
    this.dbPath = path.join(dir, fileName);

    this.db = new Database(this.dbPath);

    // Engine-controlled pragmas
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
    `);

    // Seed database
    if (this.seedSql) {
      this.db.exec(this.seedSql);
    }

    this.active = true;
  }

  /**
   * Execute validated SQL statements sequentially
   * @param {string[]} statements
   */
  async execute(statements) {
    if (!this.active) {
      throw new Error("Engine not initialized or already destroyed");
    }

    this.lastSelectResult = null;

    try {
      for (const stmt of statements) {
        const trimmed = stmt.trim().toLowerCase();
        const isSelect =
          trimmed.startsWith("select") || trimmed.startsWith("with");

        if (isSelect) {
          this.lastSelectResult = this.db.prepare(stmt).all();
        } else {
          this.db.exec(stmt);
        }
      }

      return {
        success: true,
        output: this.lastSelectResult ?? [],
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        output: null,
        error: err.message,
      };
    }
  }

  /**
   * Destroy engine:
   * - close db
   * - delete db file
   */
  async destroy() {
    if (!this.db) return;

    this.db.close();

    if (this.dbPath && fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
      // Also delete WAL files if they exist
      const walPath = `${this.dbPath}-wal`;
      const shmPath = `${this.dbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    }

    this.db = null;
    this.dbPath = null;
    this.active = false;
  }
}
