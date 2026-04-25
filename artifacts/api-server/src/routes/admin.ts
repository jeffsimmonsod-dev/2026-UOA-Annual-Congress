import { Router, type Request, type Response } from "express";

const router = Router();

// POST /api/admin/verify — validate admin PIN without revealing whether env var exists
router.post("/admin/verify", (req: Request, res: Response) => {
  const { pin } = req.body as { pin?: string };
  const serverPin = process.env.ADMIN_PIN;

  if (!serverPin) {
    return res.status(503).json({ error: "Admin access is not configured on this server" });
  }

  if (!pin || pin !== serverPin) {
    return res.status(401).json({ valid: false });
  }

  return res.json({ valid: true });
});

export default router;
