const app = require("./app");
const {port} = require("./config/env");

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
