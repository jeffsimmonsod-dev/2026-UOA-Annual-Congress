import app from "./app";
import { logger } from "./lib/logger";
import { logAdminPinStatus } from "./lib/adminAuth";

const adminPin = process.env["ADMIN_PIN"];
if (!adminPin) {
  const message =
    "ADMIN_PIN environment variable is not set. " +
    "All admin-protected routes will reject every request until this is configured.";
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(message);
  }
  logger.warn(message);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

logAdminPinStatus();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
