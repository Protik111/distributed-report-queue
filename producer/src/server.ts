import app from "./app";
import config from "./config";

const PORT = config.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle only unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

// Do NOT handle SIGTERM/SIGINT for ts-node-dev hot reload
// ts-node-dev will restart automatically
