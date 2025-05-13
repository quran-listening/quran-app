// EngineStats.jsx
import React from 'react';
import useGaEvents from '../hooks/useGaEvents';



export default function GaEventsWidget() {
  const viewWidth = window.innerWidth;

  const report = useGaEvents();
  if (!report) return <p>Loading GA…</p>;

  return (
    <table style={{color:"#fff",width:viewWidth<480?"260px":"350px"}}>
      <thead><tr style={{textAlign:"left"}}><th>Event</th><th>Count</th></tr></thead>
      <tbody>
        {report.rows.map(r => (
          <tr key={r.dimensionValues[0].value}>
            <td>{r.dimensionValues[0].value}</td>
            <td>{r.metricValues[0].value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}