import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";

import { logger } from "./utils/logger";
import { prisma } from "./utils/prisma";
import { redis } from "./utils/redis";
import { setupQueues } from "./workers/queues";
import { setupCronJobs } from "./workers/cron";

// Routes
import authRoutes from "./routes/auth";
import workflowRoutes from "./routes/workflows";
import executionRoutes from "./routes/executions";
import analyticsRoutes from "./routes/analytics";
import alertRoutes from "./routes/alerts";
import ingestRoutes from "./routes/ingest";
import aiRoutes from "./routes/ai";
import apiKeyRoutes from "./routes/apiKeys";

const app = express();
const httpServer = createServer(app);

// ── Socket.IO ──────────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on("subscribe:org", (orgId: string) => {
    socket.join(`org:${orgId}`);
    logger.debug(`Socket ${socket.id} subscribed to org:${orgId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: [
      process.env.APP_URL || "http://localhost:3000",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: { postgres: "ok", redis: "ok" },
    });
  } catch (err) {
    res.status(503).json({ status: "error", error: String(err) });
  }
});

// ── API Routes ─────────────────────────────────────────────────────────────
const API = "/api/v1";
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/workflows`, workflowRoutes);
app.use(`${API}/executions`, executionRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/alerts`, alertRoutes);
app.use(`${API}/ingest`, ingestRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/api-keys`, apiKeyRoutes);

// ── Error Handler ──────────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err.stack || err.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.BACKEND_PORT || "4000");

async function main() {
  await setupQueues();
  await setupCronJobs();

  httpServer.listen(PORT, () => {
    logger.info(`🚀 FlowMind AI backend running on port ${PORT}`);
    logger.info(`📊 API: http://localhost:${PORT}/api/v1`);
    logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
  });
}

main().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
