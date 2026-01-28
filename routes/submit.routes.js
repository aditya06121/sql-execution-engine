import { Router } from "express";

import {
  executeSql,
  submitSql,
  resetQuestion,
} from "../controller/submit.controller.js";

const submitRouter = Router();

submitRouter.route("/execute").post(executeSql);
submitRouter.route("/submit").post(submitSql);
submitRouter.route("/reset").post(resetQuestion);

export default submitRouter;
