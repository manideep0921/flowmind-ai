// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

export interface AuthRequest extends Request {
  userId?: string;
  orgId?: string;
  role?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Check for Bearer token
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
        userId: string;
        orgId: string;
        role: string;
      };
      req.userId = decoded.userId;
      req.orgId = decoded.orgId;
      req.role = decoded.role;
      return next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
  }

  // Check for API key (x-api-key header)
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey) {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { organization: true },
    });
    if (!key) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    req.orgId = key.organizationId;
    return next();
  }

  res.status(401).json({ error: "Authentication required" });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.role || !roles.includes(req.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
};
