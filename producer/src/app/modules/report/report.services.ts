import { reportQueue } from "../../../redis/queue";
import { GENERATE_REPORT_JOB } from "../../../shared/constants";
import { IReportResponse } from "./report.interfaces";

const generateReport = async (
  reportType: string,
  data: IReportResponse,
): Promise<string> => {
  const job = await reportQueue.add(
    GENERATE_REPORT_JOB,
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
