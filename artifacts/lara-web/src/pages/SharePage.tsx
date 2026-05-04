import { useState } from "react";
import { Share2, ChevronLeft, AlertTriangle, CheckCircle2, XCircle, Repeat, Zap } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

export default function SharePage({ profile, onBack }: Props) {
  const [postUrl, setPostUrl] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [modal, setModal] = useState<{ success: boolean; message: string; shared?: number } | null>(null);
  const [progress, setProgress] = useState(0);

  async function handleShare() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a post URL" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null); setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + Math.random() * 24, 88)), 100);
    try {
      const res = await api.share(profile.cookie, postUrl.trim(), count);
      clearInterval(interval); setProgress(100);
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message, shared: res.count };
      setResult(r); setModal(r);
    } catch (err: unknown) {
      clearInterval(interval); setProgress(0);
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40, background: "var(--bg)" }}>
      {loading && (
        <div className="loading-overlay">
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 10 }}>
            <svg viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)", width: 88, height: 88 }}>
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="5" />
              <circle cx="44" cy="44" r="36" fill="none" stroke="url(#spg)" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <defs>
                <linearGradient id="spg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Share2 size={26} color="#3b82f6" />
            </div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Sharing Post...</p>
          <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>{count}× shares · 0.1s delay · {Math.round(progress)}%</p>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)" }}>
              {modal.success ? <CheckCircle2 size={30} color="#60a5fa" /> : <XCircle size={30} color="#f87171" />}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              {modal.success ? "Shares Complete!" : "Share Failed"}
            </h3>
            {modal.success && modal.shared && (
              <div style={{ fontSize: 36, fontWeight: 900, color: "#60a5fa", marginBottom: 8 }}>{modal.shared}×</div>
            )}
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 18, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#2563eb,#6366f1)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              {modal.success ? <><CheckCircle2 size={14} /> Done</> : "OK"}
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <Share2 size={20} color="#3b82f6" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Spam Share</h2>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>Multi-Share Booster · Fast Mode</p>
        </div>
        <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", fontSize: 11, fontWeight: 700, color: "#60a5fa", display: "flex", alignItems: "center", gap: 5 }}>
          <Repeat size={11} />{count}×
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div className="profile-mini" style={{ marginBottom: 14 }}>
          <img src={profile.avatar} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c3aed&color=fff`; }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{displayName}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>UID: {profile.uid}</div>
          </div>
          <span className="dot dot-green dot-pulse" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 7 }}>POST URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 9 }}>
            <span>SHARE COUNT</span>
            <span style={{ color: "#60a5fa", fontWeight: 800, fontSize: 15 }}>{count}×</span>
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="number"
              min={1}
              value={count}
              onChange={e => setCount(Math.max(1, Number(e.target.value) || 1))}
              className="lara-input"
              placeholder="Custom share count"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => setCount((v) => Math.max(1, v))}
              className="lara-btn"
              style={{ padding: "0 14px", background: "#2563eb", whiteSpace: "nowrap" }}
            >
              Set
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text3)" }}>
            <Zap size={13} color="#60a5fa" />
            Fast mode: 0.1s delay
          </div>
        </div>

        {/* Share count display */}
        <div style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Repeat size={17} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>Planned Shares</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>Posted to your timeline</div>
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#60a5fa" }}>{count}</div>
        </div>

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn" style={{ marginTop: 14, background: "linear-gradient(135deg,#2563eb,#6366f1)", boxShadow: "0 8px 30px rgba(37,99,235,0.3)" }} onClick={handleShare} disabled={loading}>
          {loading ? <><span className="spin" /> Sharing...</> : <><Share2 size={16} /> Share {count} Times</>}
        </button>

        <div className="lara-card" style={{ marginTop: 10, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: "var(--text2)", lineHeight: 1.7 }}>
            Spam sharing may trigger Facebook's anti-spam system. Use with care on secondary accounts only.
          </p>
        </div>
      </div>
    </div>
  );
}
