const express = require("express");
const cors = require("cors");
const ingestRoutes = require("./routes/ingest");
const predictRoutes = require("./routes/predict");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api", ingestRoutes);
app.use("/api/predict", predictRoutes);

app.get("/", (req, res) => {
  res.send("Node API is running");
});

app.listen(PORT, () => {
  console.log(`Node server running on http://localhost:${PORT}`);
});