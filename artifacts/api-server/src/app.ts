import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);
app.use(compression());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths that do not need a conference-scoped request:
// - /api/healthz: infrastructure health check
// - /api/conferences: creating/listing conferences (no tenant yet)
// - /api/conferences/*: fetching config for a specific conference (bootstrap)
// - /api/admin/qr-codes: browser-facing HTML admin page (PIN-protected, no custom headers)
const CONFERENCE_EXEMPT = [
  /^\/api\/healthz$/,
  /^\/api\/conferences(\/|$)/,
  /^\/api\/admin\/qr-codes/,
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const raw = req.headers["x-conference-id"];
  const headerVal = Array.isArray(raw) ? raw[0] : raw;
  const parsed = headerVal ? parseInt(headerVal, 10) : NaN;
  const isValid = Number.isFinite(parsed) && parsed > 0;

  if (CONFERENCE_EXEMPT.some((re) => re.test(req.path))) {
    req.conferenceId = isValid ? parsed : 1;
    return next();
  }

  if (!isValid) {
    res.status(400).json({
      error: "X-Conference-Id header is required and must be a positive integer",
    });
    return;
  }

  req.conferenceId = parsed;
  next();
});

app.use("/api", router);

export default app;
