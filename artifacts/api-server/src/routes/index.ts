import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pushRouter from "./push";
import photosRouter from "./photos";
import boothsRouter from "./booths";
import qrCodesRouter from "./qr-codes";
import mapCalibrateRouter from "./map-calibrate";
import adminRouter from "./admin";
import votingRouter from "./voting";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pushRouter);
router.use(photosRouter);
router.use(boothsRouter);
router.use(qrCodesRouter);
router.use(mapCalibrateRouter);
router.use(adminRouter);
router.use(votingRouter);

export default router;
