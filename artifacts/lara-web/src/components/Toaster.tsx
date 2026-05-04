import { useState, useEffect, createContext, useContext, useCallback } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

let globalShowToast: ((message: string, type?: Toast["type"]) => void) | null = null;

export function showToast(message: string, type: Toast["type"] = "info") {
  if (globalShowToast) globalShowToast(message, type);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const show = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++counter;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => { globalShowToast = show; return () => { globalShowToast = null; }; }, [show]);

  if (!toasts.length) return null;

  return (
    <div style={{ position: "fixed", top: 16, right: 16, left: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
      {toasts.map(t => (
        <div key={t.id} className="fade-in" style={{
          padding: "12px 16px",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          background: t.type === "success" ? "rgba(34,197,94,0.15)" : t.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(168,85,247,0.15)",
          border: `1px solid ${t.type === "success" ? "rgba(34,197,94,0.3)" : t.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(168,85,247,0.3)"}`,
          color: t.type === "success" ? "#4ade80" : t.type === "error" ? "#f87171" : "#c084fc",
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export { ToastContext };
