import { Router } from "express";

const router = Router();

const pushTokens = new Set<string>();
const ADMIN_PIN = "Chanae2026!";

router.post("/push/register", (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token required" });
    return;
  }
  pushTokens.add(token);
  res.json({ success: true, registered: pushTokens.size });
});

router.post("/push/send", async (req, res) => {
  const { title, body, adminPin } = req.body as {
    title?: string;
    body?: string;
    adminPin?: string;
  };

  if (adminPin !== ADMIN_PIN) {
    res.status(401).json({ error: "Invalid admin PIN" });
    return;
  }

  if (!title || !body) {
    res.status(400).json({ error: "title and body required" });
    return;
  }

  const tokens = Array.from(pushTokens);
  if (tokens.length === 0) {
    res.json({ success: true, sent: 0, message: "No registered devices" });
    return;
  }

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    data: { type: "announcement", timestamp: new Date().toISOString() },
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    res.json({ success: true, sent: tokens.length, result });
  } catch (err) {
    res.status(500).json({ error: "Failed to send notifications", details: String(err) });
  }
});

router.get("/push/stats", (req, res) => {
  res.json({ registeredDevices: pushTokens.size });
});

export default router;
