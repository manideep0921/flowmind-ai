// src/routes/ingest.ts
import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../utils/prisma";
import { analysisQueue } from "../workers/queues";
import { logger } from "../utils/logger";
import { WorkflowSource, ExecutionStatus } from "@prisma/client";

const router = Router();

const ingestRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down" },
});

router.use(ingestRateLimit);

// Middleware: validate API key for ingest endpoints
const validateIngestKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    res.status(401).json({ error: "x-api-key header required" });
    return;
  }
  const key = await prisma.apiKey.findUnique({ where: { key: apiKey } });
  if (!key) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }
  (req as any).orgId = key.organizationId;
  next();
};

// Generic ingest handler
async function handleIngest(
  req: Request,
  res: Response,
  source: WorkflowSource
): Promise<void> {
  const orgId = (req as any).orgId as string;
  const payload = req.body;

  try {
    // Store raw ingest event
    const ingestEvent = await prisma.ingestEvent.create({
      data: { source, rawPayload: payload, processed: false },
    });

    // Normalize the payload into an Execution record
    const normalized = normalizePayload(payload, source);

    // Find or create the workflow
    let workflow = await prisma.workflow.findFirst({
      where: { organizationId: orgId, source, externalId: normalized.workflowId },
    });

    if (!workflow) {
      workflow = await prisma.workflow.create({
        data: {
          name: normalized.workflowName || `${source} Workflow`,
          source,
          externalId: normalized.workflowId,
          organizationId: orgId,
          status: "ACTIVE",
        },
      });
    }

    // Create execution record
    const execution = await prisma.execution.create({
      data: {
        workflowId: workflow.id,
        status: normalized.status,
        startedAt: normalized.startedAt,
        finishedAt: normalized.finishedAt,
        durationMs: normalized.durationMs,
        errorMessage: normalized.errorMessage,
        rawLogs: normalized.rawLogs,
        inputPayload: normalized.inputPayload,
        outputData: normalized.outputData,
        triggerType: normalized.triggerType,
      },
    });

    // Mark ingest event as processed
    await prisma.ingestEvent.update({
      where: { id: ingestEvent.id },
      data: { processed: true, executionId: execution.id },
    });

    // If failed, queue AI analysis
    if (normalized.status === "FAILED" || normalized.status === "PARTIAL") {
      await analysisQueue.add("analyze-failure", {
        executionId: execution.id,
        workflowId: workflow.id,
        orgId,
      });
      logger.info(`Queued failure analysis for execution ${execution.id}`);
    }

    res.status(202).json({
      received: true,
      executionId: execution.id,
      workflowId: workflow.id,
    });
  } catch (err) {
    logger.error("Ingest error:", err);
    res.status(500).json({ error: "Failed to process ingest event" });
  }
}

// Normalize different platform payloads into a common format
function normalizePayload(payload: any, source: WorkflowSource) {
  switch (source) {
    case "ZAPIER":
      return {
        workflowId: payload.zap_id || payload.id,
        workflowName: payload.zap_name || payload.name,
        status: mapStatus(payload.status),
        startedAt: new Date(payload.started_at || payload.timestamp || Date.now()),
        finishedAt: payload.finished_at ? new Date(payload.finished_at) : new Date(),
        durationMs: payload.duration_ms,
        errorMessage: payload.error || payload.error_message,
        rawLogs: JSON.stringify(payload.steps || payload),
        inputPayload: payload.input,
        outputData: payload.output,
        triggerType: payload.trigger_type || "webhook",
      };

    case "MAKE":
      return {
        workflowId: payload.scenarioId || payload.id,
        workflowName: payload.scenarioName || payload.name,
        status: mapStatus(payload.status),
        startedAt: new Date(payload.executionStarted || payload.timestamp || Date.now()),
        finishedAt: payload.executionEnded ? new Date(payload.executionEnded) : new Date(),
        durationMs: payload.duration,
        errorMessage: payload.error?.message || payload.errorMessage,
        rawLogs: JSON.stringify(payload.modules || payload),
        inputPayload: payload.data,
        outputData: payload.result,
        triggerType: "webhook",
      };

    case "N8N":
      return {
        workflowId: payload.workflowId || payload.id,
        workflowName: payload.workflowName || payload.name,
        status: mapStatus(payload.status),
        startedAt: new Date(payload.startedAt || payload.timestamp || Date.now()),
        finishedAt: payload.finishedAt ? new Date(payload.finishedAt) : new Date(),
        durationMs: payload.executionTime,
        errorMessage: payload.data?.resultData?.error?.message,
        rawLogs: JSON.stringify(payload.data || payload),
        inputPayload: payload.data?.triggerData,
        outputData: payload.data?.resultData,
        triggerType: payload.mode || "webhook",
      };

    default: // GENERIC / INTERNAL
      return {
        workflowId: payload.workflow_id || payload.workflowId || "unknown",
        workflowName: payload.workflow_name || payload.workflowName,
        status: mapStatus(payload.status),
        startedAt: new Date(payload.started_at || payload.startedAt || Date.now()),
        finishedAt: payload.finished_at ? new Date(payload.finished_at) : new Date(),
        durationMs: payload.duration_ms || payload.durationMs,
        errorMessage: payload.error || payload.error_message || payload.errorMessage,
        rawLogs: JSON.stringify(payload.logs || payload),
        inputPayload: payload.input || payload.inputPayload,
        outputData: payload.output || payload.outputData,
        triggerType: payload.trigger_type || payload.triggerType || "api",
      };
  }
}

function mapStatus(status: string): ExecutionStatus {
  const s = (status || "").toLowerCase();
  if (s.includes("success") || s === "ok" || s === "completed") return "SUCCESS";
  if (s.includes("fail") || s === "error") return "FAILED";
  if (s.includes("partial")) return "PARTIAL";
  if (s.includes("timeout")) return "TIMEOUT";
  if (s.includes("run") || s === "in_progress") return "RUNNING";
  return "FAILED";
}

// ── Ingest Endpoints ───────────────────────────────────────────────────────

router.post("/zapier", validateIngestKey, (req, res) => handleIngest(req, res, "ZAPIER"));
router.post("/make", validateIngestKey, (req, res) => handleIngest(req, res, "MAKE"));
router.post("/n8n", validateIngestKey, (req, res) => handleIngest(req, res, "N8N"));
router.post("/internal", validateIngestKey, (req, res) => handleIngest(req, res, "INTERNAL"));
router.post("/generic", validateIngestKey, (req, res) => handleIngest(req, res, "GENERIC"));

export default router;
