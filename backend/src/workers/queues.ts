// src/workers/queues.ts
import Bull from "bull";
import { logger } from "../utils/logger";
import { prisma } from "../utils/prisma";
import axios from "axios";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const analysisQueue = new Bull("failure-analysis", REDIS_URL);
export const healQueue = new Bull("auto-heal", REDIS_URL);
export const notificationQueue = new Bull("notifications", REDIS_URL);

async function processAnalysis(job: Bull.Job) {
  const { executionId, workflowId, orgId } = job.data;
  logger.info(`Processing failure analysis for execution ${executionId}`);

  try {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { workflow: true, steps: true },
    });

    if (!execution) {
      logger.error(`Execution ${executionId} not found`);
      return;
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const response = await axios.post(
      `${aiServiceUrl}/analyze`,
      {
        executionId,
        workflowName: execution.workflow.name,
        workflowSource: execution.workflow.source,
        status: execution.status,
        errorMessage: execution.errorMessage,
        rawLogs: execution.rawLogs,
        inputPayload: execution.inputPayload,
        outputData: execution.outputData,
        steps: execution.steps,
      },
      {
        headers: { "x-api-key": process.env.AI_SERVICE_API_KEY || "" },
        timeout: 60000,
      }
    );

    const result = response.data;

    await prisma.failureAnalysis.upsert({
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

    // Create alert
    await prisma.alert.create({
      data: {
        workflowId,
        type: "FAILURE",
        severity: result.severity,
        title: `Workflow failure: ${result.category}`,
        message: result.explanation,
        metadata: { executionId, confidenceScore: result.confidence_score },
      },
    });

    // Queue auto-heal if critical
    if (result.severity === "CRITICAL" || result.severity === "HIGH") {
      await healQueue.add("auto-heal", { executionId, workflowId, orgId }, { delay: 2000 });
    }

    // Queue notification
    await notificationQueue.add("notify", {
      orgId,
      workflowId,
      executionId,
      severity: result.severity,
      explanation: result.explanation,
    });

    logger.info(`Analysis complete for execution ${executionId}`);
  } catch (err) {
    logger.error(`Analysis failed for ${executionId}:`, err);
    throw err;
  }
}

async function processAutoHeal(job: Bull.Job) {
  const { executionId } = job.data;
  logger.info(`Attempting auto-heal for execution ${executionId}`);

  const analysis = await prisma.failureAnalysis.findUnique({
    where: { executionId },
    include: { execution: { include: { workflow: true } } },
  });

  if (!analysis) return;

  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const result = await axios.post(
      `${aiServiceUrl}/auto-heal`,
      {
        executionId,
        category: analysis.category,
        rootCause: analysis.rootCause,
        suggestedFixes: analysis.suggestedFixes,
        workflowConfig: analysis.execution.workflow.config,
      },
      { headers: { "x-api-key": process.env.AI_SERVICE_API_KEY || "" }, timeout: 30000 }
    );

    await prisma.failureAnalysis.update({
      where: { executionId },
      data: {
        autoHealAttempted: true,
        autoHealSuccess: result.data.success,
        autoHealLog: result.data.log,
      },
    });
  } catch (err) {
    logger.error(`Auto-heal failed for ${executionId}:`, err);
    await prisma.failureAnalysis.update({
      where: { executionId },
      data: { autoHealAttempted: true, autoHealSuccess: false },
    });
  }
}

async function processNotification(job: Bull.Job) {
  const { orgId, workflowId, severity, explanation } = job.data;

  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) return;

  const emoji = severity === "CRITICAL" ? "🔴" : severity === "HIGH" ? "🟠" : "🟡";

  try {
    await axios.post(slackWebhook, {
      text: `${emoji} *FlowMind AI Alert* — ${severity} severity\n${explanation}`,
    });
  } catch (err) {
    logger.error("Slack notification failed:", err);
  }
}

export async function setupQueues() {
  analysisQueue.process("analyze-failure", 5, processAnalysis);
  healQueue.process("auto-heal", 3, processAutoHeal);
  notificationQueue.process("notify", 10, processNotification);

  analysisQueue.on("failed", (job, err) =>
    logger.error(`Analysis job ${job.id} failed:`, err)
  );
  healQueue.on("failed", (job, err) =>
    logger.error(`Heal job ${job.id} failed:`, err)
  );

  logger.info("✅ Bull queues initialized");
}
