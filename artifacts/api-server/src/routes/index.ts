import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import canvasRouter from "./canvas";
import pixelsRouter from "./pixels";
import usersRouter from "./users";
import factionsRouter from "./factions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(canvasRouter);
router.use(pixelsRouter);
router.use(usersRouter);
router.use(factionsRouter);

export default router;
