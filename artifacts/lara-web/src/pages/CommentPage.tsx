import { useState } from "react";
import { MessageSquare, ChevronLeft, AlertTriangle, Users, CheckCircle2, XCircle, Zap } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; accountCount: number; }

const DEFAULT_COMMENTS = [
  "Grabe! 😍", "So cute! 💯", "Love this! ❤️", "Sana all 😂",
  "Ikaw na! 🔥", "Nice one! 👌", "Lodi! 🙌", "Wow amazing!",
].join("\n");

const MAX_COMMENTS = 10;

export default function CommentPage({ profile, onBack, accountCount }: Props) {
  const [postUrl,     setPostUrl]     = useState("");
  const [commentText, setCommentText] = useState(DEFAULT_COMMENTS);
  const [repeatEach,  setRepeatEach]  = useState(1);
  const [useAll,      setUseAll]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [logs,        setLogs]        = useState<string[]>([]);
  const [result,      setResult]      = useState<{ success: boolean; message: string } | null>(null);
  const [modal,       setModal]       = useState<{ success: boolean; message: string } | null>(null);

  const commentList = commentText.split("\n").map(s => s.trim()).filter(Boolean);
  const rawTotal = commentList.length * repeatEach;
  const totalComments = Math.min(rawTotal, MAX_COMMENTS);
  const capped = rawTotal > MAX_COMMENTS;

  async function handleComment() {
    if (!postUrl.trim()) { setResult({ success: false, message: "Enter a post URL" }); return; }
    if (!commentList.length) { setResult({ success: false, message: "Add at least one comment" }); return; }
    setLoading(true); setLogs([]); setResult(null); setModal(null);
    try {
      let res;
      if (useAll && accountCount > 0) {
        res = await api.commentAll(postUrl.trim(), commentList, totalComments);
      } else {
        res = await api.comment(profile.cookie, postUrl.trim(), commentList, totalComments);
      }
      setLogs(res.logs || []);
      const r = { success: res.success, message: res.message };
      setResult(r); setModal(r);
    } catch (err: unknown) {
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
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(34,197,94,0.15)" strokeWidth="5" />
              <circle cx="44" cy="44" r="36" fill="none" stroke="url(#cpg)" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * 0.2}`}
                style={{ animation: "spin 1.2s linear infinite" }}
              />
              <defs>
                <linearGradient id="cpg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={28} color="#22c55e" />
            </div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Posting Comments...</p>
          <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
            {totalComments} comment{totalComments !== 1 ? "s" : ""} {useAll ? `· ${accountCount} accounts` : ""}
          </p>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}>
              {modal.success ? <CheckCircle2 size={30} color="#4ade80" /> : <XCircle size={30} color="#f87171" />}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              {modal.success ? "Comments Posted!" : "Comment Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 18, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              {modal.success ? <><CheckCircle2 size={14} /> Done</> : "OK"}
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <MessageSquare size={20} color="#22c55e" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Mass Comment</h2>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>Bulk Comment Booster · Max 10</p>
        </div>
        {useAll && accountCount > 0 && (
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", fontSize: 11, fontWeight: 700, color: "#4ade80", display: "flex", alignItems: "center", gap: 5 }}>
            <Zap size={11} />{accountCount}×
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

        {/* Boost All banner */}
        {accountCount > 0 && (
          <div className="boost-banner" style={{ marginBottom: 14, background: useAll ? "rgba(34,197,94,0.08)" : "rgba(99,102,241,0.06)", borderColor: useAll ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.18)", transition: "all 0.25s" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(129,140,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={15} color="#818cf8" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>Comment All {accountCount} Accounts</div>
              <div style={{ fontSize: 10, color: "var(--text2)" }}>No cooldown · Max 10 comments each</div>
            </div>
            <button onClick={() => setUseAll(u => !u)} style={{
              width: 46, height: 26, borderRadius: 13, flexShrink: 0,
              background: useAll ? "linear-gradient(135deg,#10b981,#22c55e)" : "var(--bg3)",
              border: "none", cursor: "pointer", position: "relative", transition: "all 0.25s",
            }}>
              <div style={{ position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", left: useAll ? 23 : 3, transition: "left 0.25s", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
            </button>
          </div>
        )}

        {/* Post URL */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 7 }}>POST URL</label>
          <input className="lara-input" value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/..." />
        </div>

        {/* Comments textarea */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 7 }}>
            <span>COMMENT TEXTS (one per line)</span>
            <span style={{ color: "#a855f7" }}>{commentList.length} text{commentList.length !== 1 ? "s" : ""}</span>
          </label>
          <textarea className="lara-input" rows={5} value={commentText}
            onChange={e => setCommentText(e.target.value)} placeholder="Enter comments, one per line..." />
        </div>

        {/* Repeat each */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.12em", marginBottom: 9 }}>
            <span>REPEAT EACH TEXT</span>
            <span style={{ color: "#a855f7", fontWeight: 800, fontSize: 14 }}>{repeatEach}×</span>
          </label>
          <input type="range" min={1} max={10} value={repeatEach} onChange={e => setRepeatEach(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b5cf6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 3 }}>
            <span>1×</span><span>10×</span>
          </div>
        </div>

        {/* Stats + cap warning */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Texts", value: commentList.length, color: "#8b5cf6" },
            { label: "Repeats", value: `${repeatEach}×`, color: "#a855f7" },
            { label: "Total", value: totalComments, color: capped ? "#f59e0b" : "#22c55e", warn: capped },
          ].map(({ label, value, color, warn }) => (
            <div key={label} style={{ flex: 1, background: "rgba(139,92,246,0.07)", border: `1px solid ${warn ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.15)"}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{label}</div>
              {warn && <div style={{ fontSize: 9, color: "#fbbf24", marginTop: 2 }}>capped</div>}
            </div>
          ))}
        </div>

        {capped && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 12px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, marginBottom: 14 }}>
            <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: "#fbbf24" }}>Capped to 10 comments to avoid suspension</p>
          </div>
        )}

        {result && !modal && (
          <div className={`result-box ${result.success ? "success" : "error"}`}>{result.message}</div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn" style={{ marginTop: 14, background: "linear-gradient(135deg,#10b981,#22c55e)", boxShadow: "0 8px 30px rgba(16,185,129,0.3)" }} onClick={handleComment} disabled={loading}>
          {loading
            ? <><span className="spin" /> Commenting...</>
            : <><MessageSquare size={16} /> {useAll ? `Comment with ${accountCount} Accounts` : `Post ${totalComments} Comment${totalComments !== 1 ? "s" : ""}`}</>
          }
        </button>

        <div className="lara-card" style={{ marginTop: 10, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: "var(--text2)", lineHeight: 1.7 }}>
            Max 10 comments per account. Mass commenting may trigger spam detection — use fresh cookies.
          </p>
        </div>
      </div>
    </div>
  );
}
