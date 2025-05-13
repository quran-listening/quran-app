// src/components/GaDashboard.jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useGaOverview from "../hooks/useGaOverview";

export default function GaDashboard() {
  const ov = useGaOverview();
  if (!ov) return <p>Loading GA…</p>;

  const { series, totals } = ov;

  return (
    <div style={{ color: "white", fontFamily: "Inter, sans-serif" }}>
      {/* KPI cards */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <Card label="Active users" value={totals.activeUsers} />
        <Card label="Event count" value={totals.eventCount} />
        <Card label="New users" value={totals.newUsers} />
      </div>

      {/* Trend line */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={series}>
          <XAxis dataKey="label" tick={{ fill: "#aaa" }} />
          <YAxis hide />
          <Tooltip />
          <Line type="monotone" dataKey="activeUsers" stroke="lime" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div style={{
      flex: 1,
      background: "#1f1f1f",
      borderRadius: 8,
      padding: "0.75rem 1rem",
      textAlign: "center"
    }}>
      <div style={{ fontSize: 12, color: "#aaa" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value.toLocaleString()}</div>
    </div>
  );
}
