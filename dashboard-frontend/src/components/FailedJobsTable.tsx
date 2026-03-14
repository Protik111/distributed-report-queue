import React from "react";

interface FailedJob {
  id: string;
  failedReason: string;
  attempts: number;
}

interface FailedJobsTableProps {
  jobs: FailedJob[];
  onRetry?: (id: string) => void;
}

const FailedJobsTable: React.FC<FailedJobsTableProps> = ({ jobs }) => {
  if (jobs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">✅</div>
        <p>No failed jobs found</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                {job.id.substring(0, 12)}...
              </td>
              <td>
                <span className="status-badge status-failed">Failed</span>
              </td>
              <td>{job.attempts}</td>
              <td
                style={{
                  maxWidth: "400px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {job.failedReason?.substring(0, 50) || "Unknown error"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FailedJobsTable;
