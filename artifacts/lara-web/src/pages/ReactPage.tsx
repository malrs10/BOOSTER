import { useState, useEffect } from "react";
import { ThumbsUp, ChevronLeft, AlertTriangle, Users, Clock, Zap, CheckCircle2 } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; accountCount: number; }

const REACTIONS = [
  { id: "LIKE",  emoji: "👍", label: "Like",  color: "#3b82f6" },
  { id: "LOVE",  emoji: "❤️", label: "Love",  color: "#ef4444" },
  { id: "HAHA",  emoji: "😂", label: "Haha",  color: "#f59e0b" },
  { id: "WOW",   emoji: "😮", label: "Wow",   color: "#f59e0b" },
  { id: "SAD",   emoji: "😢", label: "Sad",   color: "#60a5fa" },
  { id: "ANGRY", emoji: "😡", label: "Angry", color: "#ef4444" },
  { id: "CARE",  emoji: "🤗", label: "Care",  color: "#ec4899" },
];

const PRESETS = [1, 5, 10, 20, 50];
type Res = { success: boolean; message: string; count?: number; total?: number; succeeded?: number; cooldown?: boolean; cooldownSec?: number } | null;

function CooldownTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [rem, setRem] = useState(seconds);
  useEffect(() => {
    if (rem <= 0) { onDone(); return; }
    const t = setInterval(() => setRem(r => { if (r <= 1) { clearInterval(t); onDone(); return 0; } return r - 1; }), 1000);
    return () => clearInterval(t);
  }, [rem]);
  const pct = Math.max(0, (rem / seconds) * 100);
  const mins = Math.floor(rem / 60);
  const secs = rem % 60;
  return (
    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Clock size={17} color="#f59e0b" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Cooldown Active</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>Anti-suspension protection (10 min)</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: "#fbbf24", fontFamily: "monospace" }}>
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>
      <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#f59e0b,#fbbf24)", borderRadius: 3, transition: "width 1s linear" }} />
      </div>
    </div>
  );
}

export default function ReactPage({ profile, onBack, accountCount }: Props) {
  const [postUrl,    setPostUrl]    = useState("");
  const [reaction,   setReaction]   = useState("LIKE");
  const [count,      setCount]      = useState(1);
  const [useAll,     setUseAll]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [logs,       setLogs]       = useState<string[]>([]);
  const [result,     setResult]     = useState<Res>(null);
  const [modal,      setModal]      = useState<Res>(null);
  const [progress,   setProgress]   = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);

  const rxn = REACTIONS.find(r => r.id === reaction)!;
  const effectiveCount = useAll ? Math.min(accountCount, 20) : count;

  async function handleReact() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a Facebook post URL" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null); setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + Math.random() * 8, 88)), 600);
    try {
      let res;
      if (useAll && accountCount > 0) {
        res = await api.reactAll(postUrl.trim(), reaction);
      } else {
        res = await api.react(profile.cookie, postUrl.trim(), reaction, count);
      }
      clearInterval(interval);
      setProgress(100);
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message, count: res.count, total: res.total, succeeded: res.succeeded, cooldown: res.cooldown, cooldownSec: res.cooldownSec };
      setResult(r);
      if (r.cooldown && r.cooldownSec) { setCooldownSec(r.cooldownSec); }
      else setModal(r);
    } catch (err: unknown) {
      clearInterval(interval);
      setProgress(0);
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40, background: "var(--bg)" }}>
      {loading && (
        <div className="loading-overlay">
          <div style={{ position: "relative", width: 90, height: 90, marginBottom: 10 }}>
            <svg viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)", width: 90, height: 90 }}>
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="6" />
              <circle cx="45" cy="45" r="38" fill="none" stroke="url(#prg)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <defs>
                <linearGradient id="prg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{rxn.emoji}</div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Boosting Reaction...</p>
          <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
            {rxn.emoji} {reaction} · {useAll ? `${effectiveCount} accounts` : `${count} attempt${count > 1 ? "s" : ""}`}
          </p>
          <p style={{ fontSize: 13, color: "#a855f7", fontWeight: 700, marginTop: 4 }}>{Math.round(progress)}%</p>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 10 }}>{modal.success ? rxn.emoji : "❌"}</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              {modal.success ? "Reaction Boosted!" : "Boost Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.7 }}>{modal.message}</p>
            {modal.success && modal.total && (
              <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, textAlign: "left", fontSize: 12, color: "var(--text2)", lineHeight: 2 }}>
                <div><strong style={{ color: "var(--text)" }}>Reaction:</strong> {rxn.emoji} {reaction}</div>
                <div><strong style={{ color: "var(--text)" }}>Accounts:</strong> {modal.succeeded}/{modal.total} succeeded</div>
              </div>
            )}
            {!modal.success && (
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: "var(--text2)", lineHeight: 1.8, textAlign: "left" }}>
                <strong style={{ color: "#fbbf24" }}>Tip:</strong> Resolve any Facebook security alerts at facebook.com, then re-export a fresh cookie.
              </div>
            )}
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              {modal.success ? <><CheckCircle2 size={15} /> Done</> : "OK"}
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <ThumbsUp size={20} color="#ef4444" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Auto React</h2>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>Reaction Booster · 7 Types</p>
        </div>
        {useAll && accountCount > 0 && (
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", fontSize: 11, fontWeight: 700, color: "#c4b5fd", display: "flex", alignItems: "center", gap: 5 }}>
            <Zap size={11} />{Math.min(accountCount, 20)}×
          </div>
        )}
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

        {/* Cooldown timer */}
        {cooldownSec > 0 && <CooldownTimer seconds={cooldownSec} onDone={() => setCooldownSec(0)} />}

        {/* Boost All banner */}
        {accountCount > 0 && (
          <div className="boost-banner" style={{ marginBottom: 14, background: useAll ? "rgba(139,92,246,0.1)" : "rgba(99,102,241,0.06)", borderColor: useAll ? "rgba(139,92,246,0.3)" : "rgba(99,102,241,0.18)", transition: "all 0.25s" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(129,140,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={15} color="#818cf8" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Boost All {accountCount} Accounts</div>
              <div style={{ fontSize: 10, color: "var(--text2)" }}>Max 20 per batch · 10-min cooldown</div>
            </div>
            <button onClick={() => setUseAll(u => !u)} style={{
              width: 46, height: 26, borderRadius: 13, flexShrink: 0,
              background: useAll ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "var(--bg3)",
              border: "none", cursor: "pointer", position: "relative", transition: "all 0.25s",
            }}>
              <div style={{ position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", left: useAll ? 23 : 3, transition: "left 0.25s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
            </button>
          </div>
        )}

        {/* Post URL */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 7 }}>POST / VIDEO URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        {/* Reaction type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 9 }}>REACTION TYPE</label>
          <div style={{ display: "flex", gap: 5 }}>
            {REACTIONS.map(r => (
              <button key={r.id} className={`reaction-btn${reaction === r.id ? " active" : ""}`}
                onClick={() => setReaction(r.id)}
                style={{ borderColor: reaction === r.id ? r.color : undefined, background: reaction === r.id ? `${r.color}18` : undefined, boxShadow: reaction === r.id ? `0 4px 14px ${r.color}30` : "none" }}>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <span style={{ fontSize: 9, color: reaction === r.id ? r.color : "var(--text3)" }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Count — only single-account mode */}
        {!useAll && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 9 }}>
              <span>BOOST COUNT</span>
              <span style={{ color: rxn.color, fontWeight: 800, fontSize: 15 }}>{count}×</span>
            </label>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {PRESETS.map(p => (
                <button key={p} onClick={() => setCount(p)} style={{
                  flex: 1, padding: "7px 2px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${count === p ? "#8b5cf6" : "var(--border)"}`,
                  background: count === p ? "rgba(139,92,246,0.18)" : "var(--bg)",
                  color: count === p ? "#c4b5fd" : "var(--text3)", cursor: "pointer", transition: "all 0.15s",
                }}>{p}×</button>
              ))}
            </div>
            <input type="range" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
          </div>
        )}

        {result && !modal && !cooldownSec && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn lara-btn-primary" style={{ marginTop: 14, fontSize: 15, padding: "15px", boxShadow: cooldownSec > 0 ? "none" : "0 8px 30px rgba(124,58,237,0.35)" }}
          onClick={handleReact} disabled={loading || cooldownSec > 0}>
          {loading
            ? <><span className="spin" /> Boosting...</>
            : cooldownSec > 0
              ? <><Clock size={16} /> Cooldown Active</>
              : <><ThumbsUp size={16} /> {useAll ? `Boost with ${Math.min(accountCount, 20)} Accounts` : `Boost ${reaction}${count > 1 ? ` ×${count}` : ""}`}</>
          }
        </button>

        <div className="lara-card" style={{ marginTop: 10, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: "var(--text2)", lineHeight: 1.7 }}>
            10-minute cooldown between bulk boosts prevents suspension. Max 20 accounts per batch.
          </p>
        </div>
      </div>
    </div>
  );
}
