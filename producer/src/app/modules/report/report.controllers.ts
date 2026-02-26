import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReportService } from "./report.services";
import sendResponse from "../../../shared/sendResponse";

const generateReport = catchAsync(async (req: Request, res: Response) => {
  const { reportType, data } = req.body;
  const result = await ReportService.generateReport(reportType, data);

  sendResponse<{ jobId: string }>(res, {
    statusCode: 202,
    success: true,
    message: "Report job created",
    data: { jobId: result },
  });
});

export const ReportController = {
  generateReport,
};
