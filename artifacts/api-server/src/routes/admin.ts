import { Router, type Request, type Response } from "express";
import { createOperatorSession } from "../lib/operator-session";
import { checkAdminPin, clientIp, sendAdminFailure } from "../lib/adminAuth";

const router = Router();

// POST /api/admin/verify — validate the admin PIN (constant-time, locked out
// after repeated failures) and, for the dashboard, issue a named operator session.
router.post("/admin/verify", (req: Request, res: Response) => {
  const { pin, name } = (req.body ?? {}) as { pin?: unknown; name?: unknown };
  const result = checkAdminPin(clientIp(req), pin);

  if (!result.ok) {
    if (result.reason === "invalid" || result.reason === "missing") {
      res.status(401).json({ valid: false });
      return;
    }
    sendAdminFailure(res, result);
    return;
  }

  // Older mobile admin clients only verify their PIN. They receive no named
  // session and cannot use the session-required community decision endpoints.
  if (name === undefined) {
    res.json({ valid: true });
    return;
  }

  const operatorName = typeof name === "string" ? name.trim() : "";
  if (!operatorName || operatorName.length > 50 || /[\x00-\x1f\x7f]/.test(operatorName) || operatorName === "Admin (shared PIN)") {
    res.status(400).json({ error: "Operator name must be 1–50 characters" });
    return;
  }

  const { token, session } = createOperatorSession(operatorName);
  res.json({ valid: true, operatorName: session.name, operatorSession: token });
});

export default router;
