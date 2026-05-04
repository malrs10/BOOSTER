import { useEffect, useRef } from "react";

interface Props {
  logs: string[];
}

function getLineClass(log: string): string {
  const u = log.toUpperCase();
  if (u.includes("[OK]") || u.includes("SUCCESS") || u.includes("✓")) return "log-line-ok";
  if (u.includes("[FAIL]") || u.includes("ERROR") || u.includes("✗")) return "log-line-fail";
  if (u.includes("[WARN]")) return "log-line-warn";
  if (u.includes("[INFO]")) return "log-line-info";
  return "log-line-debug";
}

export default function LogWindow({ logs }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  if (!logs.length) return null;

  return (
    <div ref={ref} style={{
      background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 12,
      maxHeight: 200,
      overflowY: "auto",
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 12,
      lineHeight: 1.6,
    }}>
      {logs.map((log, i) => (
        <div key={i} className={getLineClass(log)}>{log}</div>
      ))}
    </div>
  );
}
