import express from "express";

const app = express();

app.use(express.json());

import submitRouter from "./routes/submit.routes.js";

app.use("/api", submitRouter);

export default app;
