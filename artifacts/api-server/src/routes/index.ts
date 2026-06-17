import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import studentsRouter from "./students";
import feesRouter from "./fees";
import paymentsRouter from "./payments";
import accountsRouter from "./accounts";
import capitationRouter from "./capitation";
import expensesRouter from "./expenses";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(studentsRouter);
router.use(feesRouter);
router.use(paymentsRouter);
router.use(accountsRouter);
router.use(capitationRouter);
router.use(expensesRouter);
router.use(reportsRouter);

export default router;
