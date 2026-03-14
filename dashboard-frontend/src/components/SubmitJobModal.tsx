import React, { useState } from "react";

interface SubmitJobModalProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const SubmitJobModal: React.FC<SubmitJobModalProps> = ({ onClose, onSubmitSuccess }) => {
  const [reportType, setReportType] = useState("sales");
  const [period, setPeriod] = useState("");
  const [revenue, setRevenue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/api/v1/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          data: { period, revenue },
        }),
      });

      if (response.ok) {
        alert("✅ Report job submitted successfully!");
        onSubmitSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.message || "Failed to submit"}`);
      }
    } catch (err) {
      alert(`❌ Network error: ${typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={{ marginBottom: "20px" }}>➕ Generate New Report</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Report Type */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={styles.select}
            >
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="performance">Performance</option>
              <option value="test">Test</option>
            </select>
          </div>

          {/* Period Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Period</label>
            <input
              type="text"
              placeholder="e.g., Q1 2024"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Revenue Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Revenue ($)</label>
            <input
              type="number"
              placeholder="e.g., 125000"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Action Buttons */}
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...styles.button, ...styles.cancelButton }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.button, ...styles.submitButton }}
            >
              {loading ? "Submitting..." : "Generate Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: 600,
    fontSize: "14px",
    color: "#444",
  },
  select: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  button: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cancelButton: {
    background: "#f5f5f5",
    color: "#666",
  },
  submitButton: {
    background: "#1976d2",
    color: "white",
  },
};

export default SubmitJobModal;