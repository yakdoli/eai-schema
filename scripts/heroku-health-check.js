// Simple health check endpoint for Heroku deployment verification
const express = require("express");
const app = express();

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "eai-schema-toolkit-health-check"
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});