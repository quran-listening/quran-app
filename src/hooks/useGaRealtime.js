import { useEffect, useState } from "react";

export default function useGaRealtime(url = "/api/ga/realtime") {
  const [data, setData] = useState(null);
  useEffect(() => {
    const id = setInterval(async () => {
      const r = await fetch(url, { cache: "no-cache" });
      if (r.ok) setData(await r.json());
    }, 9091);                         // poll every 5 s
    return () => clearInterval(id);
  }, [url]);
  return data;
} 
