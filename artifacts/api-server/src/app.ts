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

// Paths that do not use the conference header middleware's standard requirement:
// - /api/healthz: infrastructure health check
// - /api/conferences: creating/listing conferences (no tenant yet)
// - /api/conferences/*: fetching config for a specific conference (bootstrap)
// - /api/admin/qr-codes: browser-facing HTML admin page (PIN-protected, no custom headers)
// - /api/storage/objects/*: image clients may pass the conference via query instead
const CONFERENCE_EXEMPT = [
  /^\/api\/healthz$/,
  /^\/api\/conferences(\/|$)/,
  /^\/api\/admin\/qr-codes/,
  /^\/api\/admin\/verify$/,
  /^\/api\/storage\/objects\//,
  /^\/api\/storage\/uploads\//,
];

function parsePositiveConferenceId(value: unknown): number | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" || !/^[1-9]\d*$/.test(candidate.trim())) return null;
  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const isPhotoObjectPath = /^\/api\/storage\/objects\//.test(req.path);
  const raw = req.headers["x-conference-id"];
  const headerConferenceId = parsePositiveConferenceId(raw);

  if (isPhotoObjectPath) {
    const conferenceId = headerConferenceId ?? parsePositiveConferenceId(req.query.conferenceId);
    if (conferenceId === null) {
      res.status(400).json({
        error: "X-Conference-Id header or conferenceId query parameter is required and must be a positive integer",
      });
      return;
    }
    req.conferenceId = conferenceId;
    return next();
  }

  const isValid = headerConferenceId !== null;

  if (CONFERENCE_EXEMPT.some((re) => re.test(req.path))) {
    req.conferenceId = isValid ? headerConferenceId : 1;
    return next();
  }

  if (!isValid) {
    res.status(400).json({
      error: "X-Conference-Id header is required and must be a positive integer",
    });
    return;
  }

  req.conferenceId = headerConferenceId;
  next();
});

app.use("/api", router);

export default app;
