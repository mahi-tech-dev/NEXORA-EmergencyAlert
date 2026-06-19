import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import emergenciesRouter from "./emergencies";
import nearbyRouter from "./nearby";
import profileRouter from "./profile";
import contactsRouter from "./contacts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(emergenciesRouter);
router.use(nearbyRouter);
router.use(profileRouter);
router.use(contactsRouter);

export default router;
