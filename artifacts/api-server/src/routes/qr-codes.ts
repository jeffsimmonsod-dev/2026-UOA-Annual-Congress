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

  const qrItems = await Promise.all(
    rows.map(async (booth) => {
      const payload = `uoa2026:booth:${booth.id}:${booth.secret_token}`;
      const svg = await QRCode.toString(payload, {
        type: "svg",
        margin: 1,
        color: { dark: "#1e293b", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      return { booth, svg };
    })
  );

  const cards = qrItems.map(({ booth, svg }) => `
    <div class="card">
      <div class="qr">${svg}</div>
      <div class="info">
        <div class="booth-num">Booth ${booth.booth_number ?? booth.id}</div>
        <div class="company">${escHtml(booth.company || booth.name)}</div>
      </div>
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>2026 UOA Annual Congress — Exhibitor QR Codes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
    }

    header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }
    header h1 { font-size: 22px; font-weight: 700; color: #1e293b; }
    header p  { font-size: 13px; color: #64748b; margin-top: 4px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }

    .card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .qr { width: 160px; height: 160px; }
    .qr svg { width: 100%; height: 100%; }

    .info { text-align: center; }
    .booth-num {
      display: inline-block;
      background: #4f46e5;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      padding: 2px 10px;
      margin-bottom: 6px;
    }
    .company {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
    }

    .print-btn {
      position: fixed;
      top: 16px; right: 16px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79,70,229,.35);
    }
    .print-btn:hover { background: #4338ca; }

    .count-badge {
      display: inline-block;
      background: #e0e7ff;
      color: #4f46e5;
      border-radius: 20px;
      padding: 2px 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 6px;
    }

    @media print {
      body { background: #fff; padding: 12px; }
      .print-btn { display: none; }
      header { margin-bottom: 16px; }
      .grid { grid-template-columns: repeat(4, 1fr); gap: 12px; }
      .card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; }
      .qr { width: 130px; height: 130px; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print All QR Codes</button>

  <header>
    <h1>2026 UOA Annual Congress</h1>
    <p>Grand Hyatt Deer Valley · Park City, Utah · June 4–7, 2026</p>
    <span class="count-badge">${rows.length} exhibitor QR codes</span>
  </header>

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
    `SELECT id, name, company, booth_number, secret_token
     FROM congress_booths
     ORDER BY booth_number ASC, name ASC`
  );

  res.json({ booths: rows });
});

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default router;
