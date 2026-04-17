import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pushRouter from "./push";
import photosRouter from "./photos";
import boothsRouter from "./booths";
import qrCodesRouter from "./qr-codes";
import mapCalibrateRouter from "./map-calibrate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pushRouter);
router.use(photosRouter);
router.use(boothsRouter);
router.use(qrCodesRouter);
router.use(mapCalibrateRouter);

export default router;
