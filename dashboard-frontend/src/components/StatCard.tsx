import React from "react";

interface StatCardProps {
  value: number;
  label: string;
  variant?: "pending" | "active" | "completed" | "failed" | "delayed";
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  variant = "pending",
}) => {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </div>
    </div>
  );
};

export default StatCard;
