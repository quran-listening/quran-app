import { useState, useEffect } from "react";

function yyyyMMddToLabel(s) {
  // "20240506" -> "06 May"
  return new Date(
    Number(s.slice(0, 4)),
    Number(s.slice(4, 6)) - 1,
    Number(s.slice(6, 8))
  ).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default function useGaOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:9091";
      const r = await fetch(`${baseUrl}/api/ga/overview`, { cache: "no-cache" });
      if (!r.ok) return;

      const j = await r.json();

      // rows → [{label, activeUsers, eventCount, newUsers}]
      const series = j.rows.map(row => {
        const d = row.dimensionValues[0].value;
        return {
          label: yyyyMMddToLabel(d),
          activeUsers: +row.metricValues[0].value,
          eventCount: +row.metricValues[1].value,
          newUsers: +row.metricValues[2].value
        };
      });

      // totals row (metricAggregations)
      const totals = {
        activeUsers: +j.totals[0].metricValues[0].value,
        eventCount: +j.totals[0].metricValues[1].value,
        newUsers: +j.totals[0].metricValues[2].value
      };

      setData({ series, totals });
    })();
  }, []);

  return data;          // null until loaded
}
