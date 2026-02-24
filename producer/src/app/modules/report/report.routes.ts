import { Router } from "express";
import { ReportController } from "./report.controllers";

const router = Router();

router.post(
  "/",
  //   validateRequest(TodoValidation.createTodoZodSchema),
  ReportController.generateReport,
);

export const ReportRoutes = router;
