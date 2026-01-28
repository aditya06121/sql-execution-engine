import { validateSql } from "../services/sqlValidationService.js";
const submitCode = async (req, res) => {
  try {
    const { code, expectedOutput } = req.body;
    // console.log(`Code: ${code},expectedOutput: ${expectedOutput}`);
    const { statements } = validateSql(code);
    console.log(statements);

    return res.status(201).json({ status: "code received successfully" });
  } catch (e) {
    return res.status(500).json({
      error: "failed to submit the code for evaluation",
      details: e.message,
    });
  }
};

export { submitCode };
