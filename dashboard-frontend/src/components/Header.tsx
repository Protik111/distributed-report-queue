import React from "react";

interface HeaderProps {
  lastRefresh: number;
  onRefresh: () => void;
  loading: boolean;
  onOpenModal?: () => void; // ← Add this optional prop
}

const Header: React.FC<HeaderProps> = ({
  lastRefresh,
  onRefresh,
  loading,
  onOpenModal,
}) => {
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

        {/* Changed from link to button */}
        <button
          onClick={onOpenModal}
          className="btn btn-primary"
          style={{ marginLeft: "12px" }}
        >
          ➕ New Report
        </button>
      </div>
    </div>
  );
};

export default Header;
