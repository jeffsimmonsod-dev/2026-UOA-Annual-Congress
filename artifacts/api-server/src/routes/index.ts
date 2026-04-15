import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pushRouter from "./push";
import photosRouter from "./photos";
import boothsRouter from "./booths";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pushRouter);
router.use(photosRouter);
router.use(boothsRouter);

export default router;
