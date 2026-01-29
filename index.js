import "dotenv/config";

const PORT = process.env.PORT || 6060;
//console.log(PORT);

import app from "./app.js";

try {
  app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}`);
  });
} catch {
  console.log(`Failed to start express server`);
}
