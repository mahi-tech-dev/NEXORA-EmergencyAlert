import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import emergenciesRouter from "./emergencies";
import nearbyRouter from "./nearby";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(emergenciesRouter);
router.use(nearbyRouter);

export default router;
