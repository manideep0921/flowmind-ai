// src/routes/workflows.ts
import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

// GET /api/v1/workflows
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { organizationId: req.orgId },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
        _count: { select: { executions: true } },
        riskScore: { select: { score: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const workflowIds = workflows.map((wf) => wf.id);

    // Single grouped query instead of N+1 per workflow
    const [failedCounts, successCounts] = await Promise.all([
      prisma.execution.groupBy({
        by: ["workflowId"],
        where: { workflowId: { in: workflowIds }, status: "FAILED" },
        _count: { id: true },
      }),
      prisma.execution.groupBy({
        by: ["workflowId"],
        where: { workflowId: { in: workflowIds }, status: "SUCCESS" },
        _count: { id: true },
      }),
    ]);

    const failedMap = new Map(failedCounts.map((r) => [r.workflowId, r._count.id]));
    const successMap = new Map(successCounts.map((r) => [r.workflowId, r._count.id]));

    const withStats = workflows.map((wf) => {
      const total = wf._count.executions;
      const failed = failedMap.get(wf.id) ?? 0;
      const success = successMap.get(wf.id) ?? 0;
      return {
        ...wf,
        stats: {
          totalExecutions: total,
          failedExecutions: failed,
          successRate: total > 0 ? Math.round((success / total) * 100) : 0,
          riskScore: wf.riskScore?.score ?? null,
        },
      };
    });

    res.json(withStats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// GET /api/v1/workflows/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 20,
          include: { analysis: true },
        },
      },
    });

    if (!workflow || workflow.organizationId !== req.orgId) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

// POST /api/v1/workflows
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, source, externalId, config } = req.body;
    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        source: source || "GENERIC",
        externalId,
        config: config || {},
        organizationId: req.orgId!,
      },
    });
    res.status(201).json(workflow);
  } catch (err) {
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

// PATCH /api/v1/workflows/:id
router.patch("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.workflow.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.orgId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    // Allowlist updatable fields to prevent mass-assignment
    const { name, description, status, config } = req.body;
    const updated = await prisma.workflow.update({
      where: { id: req.params.id },
      data: { name, description, status, config },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

// DELETE /api/v1/workflows/:id
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.workflow.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.orgId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await prisma.workflow.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

export default router;
