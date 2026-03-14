import { Router } from "express";
import { ReportController } from "./report.controllers";

const router = Router();

router.post(
  "/generate",
  //   validateRequest(TodoValidation.createTodoZodSchema),
  ReportController.generateReport,
);

export const ReportRoutes = router;
