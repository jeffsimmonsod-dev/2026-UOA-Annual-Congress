import { Router, type Request, type Response } from "express";
import { checkAdminPin, clientIp, sendAdminFailure } from "../lib/adminAuth";

const router = Router();

// POST /api/admin/verify — validate the admin PIN (rate limited / locked out after repeated failures)
router.post("/admin/verify", (req: Request, res: Response) => {
  const { pin } = (req.body ?? {}) as { pin?: unknown };
  const result = checkAdminPin(clientIp(req), pin);

  if (result.ok) {
    res.json({ valid: true });
    return;
  }
  if (result.reason === "invalid" || result.reason === "missing") {
    res.status(401).json({ valid: false });
    return;
  }
  sendAdminFailure(res, result);
});

export default router;
