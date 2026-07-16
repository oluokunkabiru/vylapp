import http from "http";
import { Server } from "socket.io";
import createApp from "./app";
import env from "./config/env";
import { attachSockets } from "./sockets";
import { verifyMailConfig } from "./utils/mailer";
import logger from "./utils/logger";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin, credentials: true } });

attachSockets(io);
app.set("io", io); // lets routes emit real-time events, e.g. req.app.get("io")

server.listen(env.port, () => {
  logger.info(`vylapp-backend listening on port ${env.port}`, { env: env.nodeEnv });
  verifyMailConfig();
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
