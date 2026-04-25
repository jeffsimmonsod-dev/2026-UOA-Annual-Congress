import { Router, type Request, type Response } from "express";
import QRCode from "qrcode";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const router = Router();

function getAdminPin(): string {
  const pin = process.env.ADMIN_PIN;
  if (!pin) throw new Error("ADMIN_PIN environment variable is not set");
  return pin;
}

function isAuthorized(req: Request): boolean {
  try {
    return req.headers["x-admin-pin"] === getAdminPin();
  } catch {
    return false;
  }
}

// GET /admin/qr-codes — show PIN login form
router.get("/admin/qr-codes", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Login — UOA Congress 2026</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 36px 32px; max-width: 380px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    p  { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
    input[type=password] { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 15px; outline: none; transition: border-color .15s; }
    input[type=password]:focus { border-color: #4f46e5; }
    button { width: 100%; margin-top: 16px; padding: 13px; background: #4f46e5; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }
    button:hover { background: #4338ca; }
    .err { color: #ef4444; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Access</h1>
    <p>Enter the UOA admin PIN to view and print exhibitor QR codes.</p>
    <form method="POST" action="">
      <label for="pin">Admin PIN</label>
      <input type="password" id="pin" name="pin" autofocus autocomplete="current-password" required />
      <button type="submit">View QR Codes</button>
    </form>
  </div>
</body>
</html>`);
});

// POST /admin/qr-codes — verify PIN in request body then render QR sheet
router.post("/admin/qr-codes", async (req: Request, res: Response) => {
  const submittedPin: string = (req.body?.pin as string) ?? "";

  try {
    if (submittedPin !== getAdminPin()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(403).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Login — UOA Congress 2026</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 36px 32px; max-width: 380px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    p  { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
    input[type=password] { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 15px; outline: none; transition: border-color .15s; }
    input[type=password]:focus { border-color: #4f46e5; }
    button { width: 100%; margin-top: 16px; padding: 13px; background: #4f46e5; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }
    button:hover { background: #4338ca; }
    .err { color: #ef4444; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Access</h1>
    <p>Enter the UOA admin PIN to view and print exhibitor QR codes.</p>
    <form method="POST" action="">
      <label for="pin">Admin PIN</label>
      <input type="password" id="pin" name="pin" autofocus autocomplete="current-password" required />
      <button type="submit">View QR Codes</button>
      <p class="err">Incorrect PIN. Please try again.</p>
    </form>
  </div>
</body>
</html>`);
    }
  } catch {
    return res.status(503).json({ error: "Server configuration error" });
  }

  const { rows } = await pool.query(
    `SELECT id, name, company, booth_number, secret_token
     FROM congress_booths
     ORDER BY booth_number ASC, name ASC`
  );

  if (rows.length === 0) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>No Booths Found</h2>
        <p>Create booths in the admin panel first.</p>
      </body></html>
    `);
  }

  const cards = rows.map((booth) => `
    <div class="card">
      <div class="booth-num">Booth ${escHtml(booth.booth_number ?? String(booth.id))}</div>
      <div class="company">${escHtml(booth.company || booth.name)}</div>
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>2026 UOA Annual Congress — Booth Directory</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
    header { text-align: center; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
    header h1 { font-size: 22px; font-weight: 700; color: #1e293b; }
    header p  { font-size: 13px; color: #64748b; margin-top: 4px; }
    .notice { background: #fef3c7; border: 1.5px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #92400e; line-height: 1.5; }
    .notice strong { font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .booth-num { display: inline-block; background: #4f46e5; color: #fff; font-size: 12px; font-weight: 700; border-radius: 6px; padding: 2px 10px; margin-bottom: 8px; }
    .company { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.3; }
    .count-badge { display: inline-block; background: #e0e7ff; color: #4f46e5; border-radius: 20px; padding: 2px 12px; font-size: 12px; font-weight: 600; margin-top: 6px; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: #4f46e5; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
    @media print { body { background: #fff; padding: 12px; } .print-btn { display: none; } .notice { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print</button>
  <header>
    <h1>2026 UOA Annual Congress</h1>
    <p>Grand Hyatt Deer Valley · Park City, Utah · June 4–7, 2026</p>
    <span class="count-badge">${rows.length} exhibitor booths</span>
  </header>
  <div class="notice">
    <strong>Live Check-in QR Codes</strong> are now managed in the admin app.<br>
    Open the Booths tab in the mobile admin panel, expand a booth, and display the rotating QR code for attendees to scan. Codes refresh automatically every 30 seconds.
  </div>
  <div class="grid">${cards}</div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// GET /api/booths/admin/qr-codes — API endpoint for admin mobile app (uses x-admin-pin header)
router.get("/booths/admin/qr-codes", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { rows } = await pool.query(
    `SELECT id, name, company, booth_number
     FROM congress_booths
     ORDER BY booth_number ASC, name ASC`
  );

  res.json({ booths: rows });
});

// GET /api/booths/admin/:id/qr?scanCode=<code> — returns QR data URL for a server-issued scan code (admin only)
// scanCode is required; it must be a code issued by POST /api/booths/admin/:id/scan-code.
router.get("/booths/admin/:id/qr", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const boothId = parseInt(req.params.id, 10);
  if (isNaN(boothId)) {
    return res.status(400).json({ error: "Invalid booth ID" });
  }

  const scanCode = req.query.scanCode as string | undefined;
  if (!scanCode || scanCode.length < 8 || scanCode.length > 128) {
    return res.status(400).json({ error: "scanCode query parameter is required" });
  }

  const { rows } = await pool.query(
    "SELECT id FROM congress_booths WHERE id = $1",
    [boothId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Booth not found" });
  }

  const payload = `uoa2026:booth:${boothId}:${scanCode}`;

  const dataUrl = await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  res.json({ dataUrl });
});

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default router;
