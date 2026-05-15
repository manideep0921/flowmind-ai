// src/routes/executions.ts
import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId, status, limit = "50", offset = "0" } = req.query;

    const workflows = await prisma.workflow.findMany({
      where: { organizationId: req.orgId },
      select: { id: true },
    });
    const orgWorkflowIds = workflows.map((w) => w.id);

    const where: any = { workflowId: { in: orgWorkflowIds } };
    if (workflowId) where.workflowId = workflowId;
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        include: { workflow: true, analysis: true },
        orderBy: { startedAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.execution.count({ where }),
    ]);

    res.json({ executions, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch executions" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const execution = await prisma.execution.findUnique({
      where: { id: req.params.id },
      include: { workflow: true, steps: true, analysis: true },
    });

    if (!execution || execution.workflow.organizationId !== req.orgId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(execution);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch execution" });
  }
});

export default router;
