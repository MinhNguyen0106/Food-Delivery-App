const { port } = require("./src/config/env");
const app = require("./src/app");

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
