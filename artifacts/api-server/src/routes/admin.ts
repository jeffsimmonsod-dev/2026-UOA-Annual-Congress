import { Router, type Request, type Response } from "express";
import { createOperatorSession } from "../lib/operator-session";

const router = Router();

// POST /api/admin/verify — validate admin PIN without revealing whether env var exists
router.post("/admin/verify", (req: Request, res: Response) => {
  const { pin, name } = (req.body ?? {}) as { pin?: string; name?: string };
  const serverPin = process.env.ADMIN_PIN;

  if (!serverPin) {
    return res.status(503).json({ error: "Admin access is not configured on this server" });
  }

  if (!pin || pin !== serverPin) {
    return res.status(401).json({ valid: false });
  }

  // Older mobile admin clients only verify their PIN. They receive no named
  // session and cannot use the session-required community decision endpoints.
  if (name === undefined) return res.json({ valid: true });

  const operatorName = typeof name === "string" ? name.trim() : "";
  if (!operatorName || operatorName.length > 50 || /[\x00-\x1f\x7f]/.test(operatorName) || operatorName === "Admin (shared PIN)") {
    return res.status(400).json({ error: "Operator name must be 1–50 characters" });
  }

  const { token, session } = createOperatorSession(operatorName);
  return res.json({ valid: true, operatorName: session.name, operatorSession: token });
});

export default router;
