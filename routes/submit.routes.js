import { Router } from "express";

import { submitCode } from "../controller/submit.controller.js";

const submitRouter = Router();

submitRouter.route("/submit").post(submitCode); //middleware for authentication can be added here

export default submitRouter;
