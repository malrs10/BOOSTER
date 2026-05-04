import { useState } from "react";
import { KeyRound, ChevronLeft, Copy, Check, Lock, AlertCircle, Fingerprint, RefreshCw } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

export default function TokenPage({ profile, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [token,   setToken]   = useState<string | null>(null);
  const [uid,     setUid]     = useState<string | null>(null);
  const [logs,    setLogs]    = useState<string[]>([]);
  const [copied,  setCopied]  = useState(false);
  const [modal,   setModal]   = useState<{ success: boolean; message: string } | null>(null);

  async function handleGetToken() {
    setLoading(true); setToken(null); setLogs([]); setModal(null);
    try {
      const res = await api.token(profile.cookie);
      setLogs(res.logs || []);
      if (res.token) {
        setToken(res.token);
        setUid(res.uid);
        setModal({ success: true, message: "Access token extracted successfully! Keep it secret — it gives full account access." });
      } else {
        setModal({ success: false, message: "Could not extract token. The account may have a checkpoint or cookie may have expired." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs(prev => [...prev, `[FAIL] ${msg}`]);
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 40, background: "var(--bg)" }}>
      {loading && (
        <div className="loading-overlay">
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 10 }}>
            <svg viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)", width: 88, height: 88 }}>
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="5" />
              <circle cx="44" cy="44" r="36" fill="none" stroke="url(#tpg)" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * 0.25}`}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <defs>
                <linearGradient id="tpg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" /><stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={27} color="#f59e0b" />
            </div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Extracting Token...</p>
          <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>Scanning Facebook session</p>
        </div>
      )}

      {modal && !loading && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: modal.success ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)" }}>
              <KeyRound size={28} color={modal.success ? "#fbbf24" : "#f87171"} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              {modal.success ? "Token Extracted!" : "Extraction Failed"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 18, lineHeight: 1.6 }}>{modal.message}</p>
            <button className="lara-btn" onClick={() => setModal(null)} style={{ background: modal.success ? "linear-gradient(135deg,#d97706,#f59e0b)" : "linear-gradient(135deg,#ef4444,#dc2626)", padding: "12px" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <KeyRound size={20} color="#f59e0b" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Access Token</h2>
          <p style={{ fontSize: 11, color: "var(--text3)" }}>EAAG Token Extractor</p>
        </div>
        {token && (
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", fontSize: 11, fontWeight: 700, color: "#4ade80" }}>
            Extracted
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

        {/* Info card */}
        <div className="lara-card" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Fingerprint size={24} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>EAAG Access Token</h3>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
                Extracts the EAAG token from your active Facebook session. Required for Graph API calls and automation tools.
              </p>
            </div>
          </div>
        </div>

        {/* Token result */}
        {token && (
          <div className="lara-card" style={{ padding: 16, marginBottom: 14, border: "1px solid rgba(245,158,11,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.1em" }}>ACCESS TOKEN</span>
              <button onClick={copyToken} style={{
                background: copied ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                color: copied ? "#4ade80" : "#fbbf24",
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5,
              }}>
                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: 10, color: "#fbbf24", wordBreak: "break-all", lineHeight: 1.8, maxHeight: 100, overflow: "auto" }}>
              {token}
            </div>
            {uid && (
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text2)" }}>
                UID: <span style={{ color: "var(--text)", fontWeight: 600 }}>{uid}</span>
              </div>
            )}
          </div>
        )}

        <LogWindow logs={logs} />

        <button className="lara-btn" style={{ marginTop: 14, background: token ? "linear-gradient(135deg,#374151,#6b7280)" : "linear-gradient(135deg,#d97706,#f59e0b)", boxShadow: token ? "none" : "0 8px 30px rgba(245,158,11,0.3)" }} onClick={handleGetToken} disabled={loading}>
          {loading
            ? <><span className="spin" /> Extracting...</>
            : token
              ? <><RefreshCw size={15} /> Re-extract Token</>
              : <><KeyRound size={16} /> Extract Access Token</>
          }
        </button>

        <div className="lara-card" style={{ marginTop: 10, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <Lock size={13} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: "var(--text2)", lineHeight: 1.7 }}>
            Keep your token secret. It grants full access to your Facebook account — never share it with untrusted sites or services.
          </p>
        </div>

        <div className="lara-card" style={{ marginTop: 8, padding: "10px 14px", display: "flex", gap: 9, alignItems: "flex-start" }}>
          <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: "var(--text2)", lineHeight: 1.7 }}>
            Token extraction requires an authenticated session. If extraction fails, try refreshing your cookie.
          </p>
        </div>
      </div>
    </div>
  );
}
