// src/routes/alerts.ts
import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { status, severity } = req.query;
    const workflows = await prisma.workflow.findMany({
      where: { organizationId: req.orgId },
      select: { id: true },
    });
    const ids = workflows.map((w) => w.id);
    const where: any = { workflowId: { in: ids } };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      include: { workflow: { select: { id: true, name: true, source: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.patch("/:id/acknowledge", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { workflow: true },
    });
    if (!alert || alert.workflow.organizationId !== req.orgId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: "ACKNOWLEDGED" },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

router.patch("/:id/resolve", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { workflow: true },
    });
    if (!alert || alert.workflow.organizationId !== req.orgId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

export default router;
