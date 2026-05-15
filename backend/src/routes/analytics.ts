// src/routes/analytics.ts
import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

// GET /api/v1/analytics/overview
router.get("/overview", async (req: AuthRequest, res: Response) => {
  try {
    const { days = "7" } = req.query;
    const since = new Date(Date.now() - parseInt(days as string) * 86400000);

    const workflows = await prisma.workflow.findMany({
      where: { organizationId: req.orgId },
      select: { id: true },
    });
    const workflowIds = workflows.map((w) => w.id);

    const [total, failed, succeeded, openAlerts] = await Promise.all([
      prisma.execution.count({ where: { workflowId: { in: workflowIds }, startedAt: { gte: since } } }),
      prisma.execution.count({ where: { workflowId: { in: workflowIds }, status: "FAILED", startedAt: { gte: since } } }),
      prisma.execution.count({ where: { workflowId: { in: workflowIds }, status: "SUCCESS", startedAt: { gte: since } } }),
      prisma.alert.count({ where: { workflowId: { in: workflowIds }, status: "OPEN" } }),
    ]);

    const avgDurationResult = await prisma.execution.aggregate({
      where: { workflowId: { in: workflowIds }, startedAt: { gte: since }, durationMs: { not: null } },
      _avg: { durationMs: true },
    });

    const topFailures = await prisma.failureAnalysis.groupBy({
      by: ["category"],
      where: { execution: { workflowId: { in: workflowIds } } },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 5,
    });

    res.json({
      period: `${days}d`,
      totalExecutions: total,
      failedExecutions: failed,
      succeededExecutions: succeeded,
      successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
      failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      avgDurationMs: Math.round(avgDurationResult._avg.durationMs || 0),
      openAlerts,
      topFailureCategories: topFailures.map((f) => ({
        category: f.category,
        count: f._count.category,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/v1/analytics/timeseries
router.get("/timeseries", async (req: AuthRequest, res: Response) => {
  try {
    const { days = "7" } = req.query;

    const workflows = await prisma.workflow.findMany({
      where: { organizationId: req.orgId },
      select: { id: true },
    });
    const workflowIds = workflows.map((w) => w.id);

    const since = new Date(Date.now() - parseInt(days as string) * 86400000);

    const executions = await prisma.execution.findMany({
      where: { workflowId: { in: workflowIds }, startedAt: { gte: since } },
      select: { startedAt: true, status: true, durationMs: true },
      orderBy: { startedAt: "asc" },
    });

    // Group by day
    const byDay: Record<string, { date: string; total: number; failed: number; success: number }> = {};

    for (const exec of executions) {
      const day = exec.startedAt.toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { date: day, total: 0, failed: 0, success: 0 };
      byDay[day].total++;
      if (exec.status === "FAILED") byDay[day].failed++;
      if (exec.status === "SUCCESS") byDay[day].success++;
    }

    res.json({ timeseries: Object.values(byDay) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch timeseries" });
  }
});

export default router;
