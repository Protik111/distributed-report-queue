import React from "react";
import { formatTimeAgo } from "../services/api";

interface WorkerCardProps {
  worker: {
    id: string;
    pid: number;
    uptime: number;
    timestamp: number;
  };
}

const WorkerCard: React.FC<WorkerCardProps> = ({ worker }) => {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>{worker.id}</strong>
        <span className="status-badge status-active">Active</span>
      </div>
      <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
        PID: {worker.pid} • Uptime: {Math.round(worker.uptime)}s
      </div>
      <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
        Last heartbeat: {formatTimeAgo(worker.timestamp)}
      </div>
    </div>
  );
};

export default WorkerCard;
