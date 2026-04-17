import { Router, type Request, type Response } from "express";
import QRCode from "qrcode";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const router = Router();

const ADMIN_PIN = process.env.ADMIN_PIN ?? "Chanae2026!";

// GET /admin/qr-codes?pin=... — printable QR code sheet for all booths
router.get("/admin/qr-codes", async (req: Request, res: Response) => {
  if (req.query.pin !== ADMIN_PIN) {
    return res.status(403).send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>Access Denied</h2>
        <p>Add <code>?pin=YOUR_ADMIN_PIN</code> to the URL.</p>
      </body></html>
    `);
  }

  const { rows } = await pool.query(
    `SELECT id, name, company, booth_number, secret_token
     FROM congress_booths
     ORDER BY booth_number ASC, name ASC`
  );

  if (rows.length === 0) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>No Booths Found</h2>
        <p>Create booths in the admin panel first.</p>
      </body></html>
    `);
  }

  // Generate SVG QR codes for all booths in parallel
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
  <button class="print-btn" onclick="window.print()">🖨 Print All QR Codes</button>

  <header>
    <h1>2026 UOA Annual Congress</h1>
    <p>Grand Hyatt Deer Valley · Park City, Utah · June 4–7, 2026</p>
    <span class="count-badge">${rows.length} exhibitor QR codes</span>
  </header>

  <div class="grid">${cards}</div>

  <script>
    // Auto-print on load if ?print=1 is set
    if (new URLSearchParams(location.search).get("print") === "1") {
      window.addEventListener("load", () => setTimeout(() => window.print(), 500));
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default router;
