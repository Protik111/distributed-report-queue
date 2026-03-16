import axios from "axios";

// Extend ImportMeta to include env property for Vite
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      [key: string]: any;
    };
  }
}

const getBaseUrl = (port: number) => {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:${port}`;
  }
  return `http://localhost:${port}`;
};

const API_BASE = import.meta.env.VITE_API_URL || getBaseUrl(5003);
const PRODUCER_BASE = getBaseUrl(5001);

interface JobResponse {
  id?: string;
  status?: string;
  progress?: number;
  result?: any;
  jobData?: any;
  attempts?: number;
  timestamp?: number;
}

interface StatsResponse {
  queue: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  timestamp: number;
}

interface Worker {
  id: string;
  pid: number;
  uptime: number;
  timestamp: number;
}

interface WorkersResponse {
  workers: Worker[];
  count: number;
  timestamp: number;
}

interface FailedJobsResponse {
  jobs: Array<{
    id: string;
    name: string;
    jobData: Record<string, any>;
    failedReason: string;
    finishedOn?: number;
    attempts: number;
    errorDetails?: { error: string; timestamp: number };
  }>;
  total: number;
  page: number;
  limit: number;
}

export interface CompletedJobsResponse {
  jobs: Array<{
    id: string;
    name: string;
    success: boolean;
    reportUrl: string;
    fileName: string;
    fileSize: number;
    processedAt: number;
  }>;
  total: number;
  page: number;
  limit: number;
}

// Statistics API
export const getStats = async (): Promise<StatsResponse> => {
  const response = await axios.get(`${API_BASE}/api/stats`);
  return response.data;
};

// Active Workers API
export const getWorkers = async (): Promise<WorkersResponse> => {
  const response = await axios.get(`${API_BASE}/api/workers`);
  return response.data;
};

// Individual Job Details
export const getJob = async (jobId: string): Promise<JobResponse | null> => {
  try {
    const response = await axios.get(`${API_BASE}/api/jobs/${jobId}`);
    return response.data;
  } catch {
    return null;
  }
};

// Failed Jobs (DLQ)
export const getFailedJobs = async (): Promise<FailedJobsResponse> => {
  const response = await axios.get(`${API_BASE}/api/jobs/failed`);
  return response.data;
};

// Completed Jobs
export const getCompletedJobs = async (): Promise<CompletedJobsResponse> => {
  const response = await axios.get(`${API_BASE}/api/jobs/completed`);
  return response.data;
};

// Submit New Job
export const submitReport = async (reportType: string, data: object) => {
  const response = await axios.post(
    `${PRODUCER_BASE}/api/v1/reports/generate`,
    { reportType, data },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
};

// Format date
export const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};