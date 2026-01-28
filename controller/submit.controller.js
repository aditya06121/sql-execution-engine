const submitCode = async (req, res) => {
  try {
    const { test } = req.body;
    console.log(`Test: ${test}`);
    return res.status(201).json({ status: "code received successfully" });
  } catch (e) {
    return res.status(500).json({
      error: "failed to submit the code for evaluation",
      details: e.message,
    });
  }
};

export { submitCode };
