import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fbRouter from "./fb.js";
import releasesRouter from "./releases.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/fb", fbRouter);
router.use("/releases", releasesRouter);

export default router;
