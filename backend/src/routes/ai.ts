// src/routes/ai.ts
import { Router, Response } from "express";
import axios from "axios";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";

const router = Router();
router.use(authenticate);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || "";

async function callAIService(endpoint: string, data: unknown) {
  const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, data, {
    headers: { "x-api-key": AI_SERVICE_API_KEY },
    timeout: 60000,
  });
  return response.data;
}

// POST /api/v1/ai/analyze/:executionId — trigger manual analysis
router.post("/analyze/:executionId", async (req: AuthRequest, res: Response): Promise<void> => {
  const { executionId } = req.params;

  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: { workflow: true, steps: true },
  });

  if (!execution || execution.workflow.organizationId !== req.orgId) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }

  try {
    const result = await callAIService("/analyze", {
      executionId: execution.id,
      workflowName: execution.workflow.name,
      workflowSource: execution.workflow.source,
      status: execution.status,
      errorMessage: execution.errorMessage,
      rawLogs: execution.rawLogs,
      inputPayload: execution.inputPayload,
      outputData: execution.outputData,
      steps: execution.steps,
    });

    // Upsert the analysis result
    const analysis = await prisma.failureAnalysis.upsert({
      where: { executionId },
      create: {
        executionId,
        rootCause: result.root_cause,
        explanation: result.explanation,
        technicalDetails: result.technical_details,
        confidenceScore: result.confidence_score,
        severity: result.severity,
        category: result.category,
        suggestedFixes: result.suggested_fixes,
        businessImpact: result.business_impact,
        similarFailures: result.similar_failures,
      },
      update: {
        rootCause: result.root_cause,
        explanation: result.explanation,
        technicalDetails: result.technical_details,
        confidenceScore: result.confidence_score,
        severity: result.severity,
        category: result.category,
        suggestedFixes: result.suggested_fixes,
        businessImpact: result.business_impact,
        similarFailures: result.similar_failures,
      },
    });

    res.json({ analysis });
  } catch (err) {
    logger.error("AI analysis error:", err);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

// POST /api/v1/ai/auto-heal/:executionId
router.post("/auto-heal/:executionId", async (req: AuthRequest, res: Response): Promise<void> => {
  const { executionId } = req.params;

  const analysis = await prisma.failureAnalysis.findUnique({
    where: { executionId },
    include: { execution: { include: { workflow: true } } },
  });

  if (!analysis || analysis.execution.workflow.organizationId !== req.orgId) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  try {
    const result = await callAIService("/auto-heal", {
      executionId,
      category: analysis.category,
      rootCause: analysis.rootCause,
      suggestedFixes: analysis.suggestedFixes,
      workflowConfig: analysis.execution.workflow.config,
    });

    await prisma.failureAnalysis.update({
      where: { executionId },
      data: {
        autoHealAttempted: true,
        autoHealSuccess: result.success,
        autoHealLog: result.log,
      },
    });

    res.json({ success: result.success, log: result.log, actions: result.actions });
  } catch (err) {
    logger.error("Auto-heal error:", err);
    res.status(500).json({ error: "Auto-heal failed" });
  }
});

// GET /api/v1/ai/predict/:workflowId
router.get("/predict/:workflowId", async (req: AuthRequest, res: Response): Promise<void> => {
  const { workflowId } = req.params;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      executions: {
        orderBy: { startedAt: "desc" },
        take: 100,
        include: { analysis: true },
      },
    },
  });

  if (!workflow || workflow.organizationId !== req.orgId) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  try {
    const result = await callAIService("/predict", {
      workflowId,
      executions: workflow.executions.map((e) => ({
        id: e.id,
        status: e.status,
        startedAt: e.startedAt,
        durationMs: e.durationMs,
        errorMessage: e.errorMessage,
        category: e.analysis?.category,
      })),
    });

    await prisma.riskScore.upsert({
      where: { workflowId },
      create: {
        workflowId,
        score: result.risk_score,
        factors: result.factors,
        nextCheckAt: new Date(Date.now() + 3600000),
      },
      update: {
        score: result.risk_score,
        factors: result.factors,
        nextCheckAt: new Date(Date.now() + 3600000),
      },
    });

    res.json(result);
  } catch (err) {
    logger.error("Prediction error:", err);
    res.status(500).json({ error: "Prediction failed" });
  }
});

// POST /api/v1/ai/chat — AI copilot chat
router.post("/chat", async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, context } = req.body;

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const result = await callAIService("/chat", {
      message,
      context,
      orgId: req.orgId,
    });
    res.json(result);
  } catch (err) {
    logger.error("AI chat error:", err);
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
