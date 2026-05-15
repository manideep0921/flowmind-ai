// src/workers/cron.ts
import cron from "node-cron";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import axios from "axios";

export async function setupCronJobs() {
  // Every hour: update risk scores for active workflows
  cron.schedule("0 * * * *", async () => {
    logger.info("Running predictive risk score update...");
    try {
      const workflows = await prisma.workflow.findMany({
        where: { status: "ACTIVE" },
        include: {
          executions: {
            orderBy: { startedAt: "desc" },
            take: 100,
            include: { analysis: true },
          },
        },
      });

      for (const workflow of workflows) {
        if (workflow.executions.length < 5) continue;

        try {
          const result = await axios.post(
            `${process.env.AI_SERVICE_URL}/predict`,
            {
              workflowId: workflow.id,
              executions: workflow.executions.map((e) => ({
                id: e.id,
                status: e.status,
                startedAt: e.startedAt,
                durationMs: e.durationMs,
                errorMessage: e.errorMessage,
                category: e.analysis?.category,
              })),
            },
            {
              headers: { "x-api-key": process.env.AI_SERVICE_API_KEY || "" },
              timeout: 30000,
            }
          );

          await prisma.riskScore.upsert({
            where: { workflowId: workflow.id },
            create: {
              workflowId: workflow.id,
              score: result.data.risk_score,
              factors: result.data.factors,
              nextCheckAt: new Date(Date.now() + 3600000),
            },
            update: {
              score: result.data.risk_score,
              factors: result.data.factors,
              nextCheckAt: new Date(Date.now() + 3600000),
            },
          });

          // Alert if risk is high
          if (result.data.risk_score > 0.7) {
            await prisma.alert.create({
              data: {
                workflowId: workflow.id,
                type: "PREDICTION",
                severity: result.data.risk_score > 0.85 ? "HIGH" : "MEDIUM",
                title: "High failure risk predicted",
                message: result.data.explanation,
                metadata: { riskScore: result.data.risk_score, factors: result.data.factors },
              },
            });
          }
        } catch (err) {
          logger.error(`Risk score update failed for workflow ${workflow.id}:`, err);
        }
      }

      logger.info(`Risk scores updated for ${workflows.length} workflows`);
    } catch (err) {
      logger.error("Cron job failed:", err);
    }
  });

  // Every 5 minutes: check for workflows that haven't run recently
  cron.schedule("*/5 * * * *", async () => {
    try {
      const workflows = await prisma.workflow.findMany({
        where: { status: "ACTIVE" },
        include: {
          executions: { orderBy: { startedAt: "desc" }, take: 1 },
        },
      });

      for (const workflow of workflows) {
        const lastExec = workflow.executions[0];
        if (!lastExec) continue;

        // If last execution was > 24h ago and has config with expected frequency
        const config = workflow.config as any;
        const expectedFrequencyHours = config?.expectedFrequencyHours;
        if (!expectedFrequencyHours) continue;

        const hoursSinceLastRun =
          (Date.now() - lastExec.startedAt.getTime()) / 3600000;

        if (hoursSinceLastRun > expectedFrequencyHours * 1.5) {
          try {
            const existing = await prisma.alert.findFirst({
              where: {
                workflowId: workflow.id,
                type: "ANOMALY",
                status: "OPEN",
                createdAt: { gte: new Date(Date.now() - 3600000) },
              },
            });

            if (!existing) {
              await prisma.alert.create({
                data: {
                  workflowId: workflow.id,
                  type: "ANOMALY",
                  severity: "MEDIUM",
                  title: "Workflow not running as expected",
                  message: `This workflow normally runs every ${expectedFrequencyHours}h but hasn't run in ${Math.round(hoursSinceLastRun)}h. It may be silently broken.`,
                },
              });
            }
          } catch (err) {
            logger.error(`Anomaly alert creation failed for workflow ${workflow.id}:`, err);
          }
        }
      }
    } catch (err) {
      logger.error("Anomaly detection cron job failed:", err);
    }
  });

  logger.info("✅ Cron jobs initialized");
}
