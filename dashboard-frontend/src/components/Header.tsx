import React from "react";

interface HeaderProps {
  lastRefresh: number;
  onRefresh: () => void;
  loading: boolean;
}

const Header: React.FC<HeaderProps> = ({ lastRefresh, onRefresh, loading }) => {
  return (
    <div className="header">
      <h1>📊 Job Queue Dashboard</h1>
      <div className="header-right">
        <button
          className={`refresh-btn ${loading ? "refreshing" : ""}`}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? null : <>🔄 Refresh</>}
          <span>Last: {new Date(lastRefresh).toLocaleTimeString()}</span>
        </button>
        <a
          href="http://localhost:5001/api/v1/reports/generate"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          ➕ New Report
        </a>
      </div>
    </div>
  );
};

export default Header;
