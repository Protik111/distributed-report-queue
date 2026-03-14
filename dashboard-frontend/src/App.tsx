import { useEffect, useState, useCallback } from "react";
import StatCard from "./components/StatCard";
import WorkerCard from "./components/WorkerCard";
import FailedJobsTable from "./components/FailedJobsTable";
import Header from "./components/Header";
import { getStats, getWorkers, getFailedJobs } from "./services/api";

type Stats = Awaited<ReturnType<typeof getStats>>;
type Workers = Awaited<ReturnType<typeof getWorkers>>;
type FailedJobs = Awaited<ReturnType<typeof getFailedJobs>>;

function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [workers, setWorkers] = useState<Workers["workers"]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJobs["jobs"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, workersRes, jobsRes] = await Promise.all([
        getStats(),
        getWorkers(),
        getFailedJobs(),
      ]);
      setStats(statsRes);
      setWorkers(workersRes.workers);
      setFailedJobs(jobsRes.jobs);
    } catch (err) {
      setError("Failed to fetch dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="container">
      <Header
        lastRefresh={stats?.timestamp || Date.now()}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          ⚠️ {error} - Retrying automatically...
        </div>
      )}

      {/* Statistics Grid */}
      {stats && (
        <div
          className="grid grid-5"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard value={stats.counts.waiting} label="waiting" />
          <StatCard
            value={stats.counts.active}
            label="active"
            variant="active"
          />
          <StatCard
            value={stats.counts.completed}
            label="completed"
            variant="completed"
          />
          <StatCard
            value={stats.counts.failed}
            label="failed"
            variant="failed"
          />
          <StatCard
            value={stats.counts.delayed}
            label="delayed"
            variant="delayed"
          />
        </div>
      )}

      {/* Progress Bars */}
      {stats && stats.counts.waiting > 0 && (
        <div
          style={{
            marginTop: "24px",
            padding: "20px",
            background: "white",
            borderRadius: "12px",
          }}
        >
          <h3 style={{ marginBottom: "12px" }}>Queue Status Overview</h3>
          {[
            { label: "Waiting", count: stats.counts.waiting, color: "#ffc107" },
            {
              label: "Processing",
              count: stats.counts.active,
              color: "#2196f3",
            },
            {
              label: "Completed",
              count: stats.counts.completed,
              color: "#4caf50",
            },
            { label: "Failed", count: stats.counts.failed, color: "#f44336" },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span>{label}</span>
                <span>{count}</span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "#f0f0f0",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min((count / Math.max(...[stats.counts.waiting, stats.counts.active, stats.counts.completed, stats.counts.failed], 1)) * 100, 100)}%`,
                    background: color,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workers Section */}
      <div className="section-title">👷 Active Workers ({workers.length})</div>
      {workers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🤖</div>
          <p>No active workers detected</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {workers.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </div>
      )}

      {/* Failed Jobs Section */}
      {failedJobs.length > 0 && (
        <>
          <div className="section-title">
            ❌ Failed Jobs ({failedJobs.length})
          </div>
          <FailedJobsTable jobs={failedJobs} />
        </>
      )}

      {/* Info Footer */}
      <div
        style={{
          marginTop: "40px",
          textAlign: "center",
          color: "#999",
          fontSize: "14px",
        }}
      >
        Auto-refresh every 5 seconds • Built with ❤️ for distributed systems
      </div>
    </div>
  );
}

export default App;
