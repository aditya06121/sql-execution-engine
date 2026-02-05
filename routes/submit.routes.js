import { Router } from "express";

import {
  executeSql,
  submitSql,
  resetQuestion,
  seedGroup,
  getSchema,
} from "../controller/submit.controller.js";

const submitRouter = Router();
submitRouter.route("/execute").post(executeSql);
submitRouter.route("/submit").post(submitSql);
submitRouter.route("/reset").post(resetQuestion);

// Create or replace a seeded DB for a question+group
submitRouter.route("/seed").post(seedGroup);

// Get schema for a question+group
submitRouter.route("/schema").post(getSchema);
export default submitRouter;
