import React from "react";
import { CompletedJobsResponse } from "../services/api";

type CompletedJob = CompletedJobsResponse["jobs"][0];

interface CompletedJobsTableProps {
  jobs: CompletedJob[];
}

const CompletedJobsTable: React.FC<CompletedJobsTableProps> = ({ jobs }) => {
  if (jobs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <p>No completed jobs found</p>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ marginTop: "24px" }}>
      <table>
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Type</th>
            <th>File Name</th>
            <th>Size</th>
            <th>Processed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                {job.id.substring(0, 12)}...
              </td>
              <td>{job.name}</td>
              <td>{job.fileName}</td>
              <td>{(job.fileSize / 1024).toFixed(2)} KB</td>
              <td>{new Date(job.processedAt).toLocaleString()}</td>
              <td>
                <a
                  href={job.reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "white",
                    textDecoration: "none",
                    background: "#4caf50",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  Download
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompletedJobsTable;
