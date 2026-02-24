import { reportQueue } from "../../../redis/queue";
import { IReportResponse } from "./report.interfaces";

const generateReport = async (
  reportType: string,
  data: IReportResponse,
): Promise<string> => {
  const job = await reportQueue.add(
    "generate-report",
    {
      reportType: reportType,
      data,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  return job.id as string;
};

export const ReportService = {
  generateReport,
};
