const http = require("http");
const { Server } = require("socket.io");
const createApp = require("./app");
const env = require("./config/env");
const { attachSockets } = require("./sockets");

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientOrigin, credentials: true } });

attachSockets(io);
app.set("io", io); // lets routes emit real-time events, e.g. req.app.get("io")

server.listen(env.port, () => {
  console.log(`[vylapp-backend] listening on port ${env.port} (${env.nodeEnv})`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
