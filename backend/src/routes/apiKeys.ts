// src/routes/apiKeys.ts
import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { randomBytes } from "crypto";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.orgId },
      select: { id: true, name: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const key = "fm_" + randomBytes(32).toString("hex");
    const apiKey = await prisma.apiKey.create({
      data: { name, key, organizationId: req.orgId! },
    });
    // Only return the raw key once on creation
    res.status(201).json({ id: apiKey.id, name: apiKey.name, key });
  } catch (err) {
    res.status(500).json({ error: "Failed to create API key" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.orgId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

export default router;
