import express from "express";

const app = express();

// Allow larger JSON payloads so `/api/seed` can accept large multiline SQL
app.use(express.json({ limit: "5mb" }));

import submitRouter from "./routes/submit.routes.js";
app.use("/api", submitRouter);

export default app;
