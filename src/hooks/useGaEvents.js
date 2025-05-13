import { useEffect, useState } from "react";

export default function useGaEvents(url = "/api/ga/events") {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const r = await fetch(url);
      if (r.status === 304) return;     // nothing new
      if (r.ok) setData(await r.json());
    })();
  }, [url]);
  return data;
}
