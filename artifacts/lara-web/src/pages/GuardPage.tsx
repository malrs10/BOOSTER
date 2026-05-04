import { useState } from "react";
import { Shield, ShieldOff, ChevronLeft, AlertCircle, CheckCircle2, XCircle, Info, Mail, Lock, Cookie } from "lucide-react";
import type { Profile } from "@/App";
import { api } from "@/lib/api";
import LogWindow from "@/components/LogWindow";

interface Props { profile: Profile; onBack: () => void; }

type Mode = "cookie" | "email";

export default function GuardPage({ profile, onBack }: Props) {
  const [guardOn, setGuardOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [modal, setModal] = useState<{ success: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "fail">("idle");
  const [mode, setMode] = useState<Mode>("cookie");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleGuard() {
    setLoading(true); setLogs([]); setModal(null); setStatus("idle");
    try {
      const res = mode === "email"
        ? await api.guardEmail(email.trim(), password, guardOn)
        : await api.guard(profile.cookie, guardOn);
      setLogs(res.logs || []);
      setStatus(res.success ? "success" : "fail");
      setModal({ success: res.success, message: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLogs([`[FAIL] ${msg}`]);
      setStatus("fail");
      setModal({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const displayName = profile.name.startsWith("User ") ? `UID: ${profile.uid}` : profile.name;
  const canSubmit = mode === "cookie" ? true : (email.trim().includes("@") && password.length >= 1);

  return (
    <div className="fb-page">
      {loading && (
        <div className="loading-overlay">
          <div style={{ position: "relative", width: 80, height: 80, marginBottom: 12 }}>
            <div className="loader" style={{ width: 80, height: 80, borderWidth: 4 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={30} color="var(--primary)" />
            </div>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {guardOn ? "Enabling Guard..." : "Disabling Guard..."}
          </p>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
            {mode === "email" ? "Logging in via b-graph → turn_shield..." : "Trying 9 methods — please wait"}
          </p>
        </div>
      )}

      {/* Tool header */}
      <div className="tool-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} /></button>
        <div className="tool-icon-box" style={{ background: "rgba(139,92,246,0.12)" }}>
          <Shield size={19} color="#8b5cf6" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Profile Guard</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Protect your profile picture</div>
        </div>
      </div>

      <div style={{ padding: "14px 14px 0" }}>

        {/* Mode selector tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 4 }}>
          <button
            onClick={() => setMode("cookie")}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: "var(--radius-sm)",
              border: "none",
              background: mode === "cookie" ? "rgba(139,92,246,0.15)" : "transparent",
              color: mode === "cookie" ? "#8b5cf6" : "var(--text3)",
              fontFamily: "inherit", fontWeight: 700, fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "all 0.15s",
            }}
          >
            <Cookie size={13} />
            Cookie Mode
          </button>
          <button
            onClick={() => setMode("email")}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: "var(--radius-sm)",
              border: "none",
              background: mode === "email" ? "rgba(139,92,246,0.15)" : "transparent",
              color: mode === "email" ? "#8b5cf6" : "var(--text3)",
              fontFamily: "inherit", fontWeight: 700, fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              transition: "all 0.15s",
            }}
          >
            <Mail size={13} />
            Email + Password
          </button>
        </div>

        {/* Cookie mode — profile card */}
        {mode === "cookie" && (
          <div className="profile-mini" style={{ marginBottom: 14 }}>
            <img
              src={profile.avatar} alt={displayName}
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8b5cf6&color=fff`; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>UID: {profile.uid}</p>
            </div>
            <span className="badge badge-success"><span className="dot dot-green" /> Live</span>
          </div>
        )}

        {/* Email mode — inputs */}
        {mode === "email" && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px", marginBottom: 14, boxShadow: "var(--shadow-card)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 10, letterSpacing: "0.08em" }}>FACEBOOK CREDENTIALS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <Mail size={14} color="var(--text3)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  placeholder="Email or phone number"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 10px 10px 32px",
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", color: "var(--text)",
                    fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={14} color="var(--text3)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 40px 10px 32px",
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", color: "var(--text)",
                    fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "var(--text3)", cursor: "pointer",
                    fontSize: 11, fontFamily: "inherit",
                  }}
                >{showPass ? "Hide" : "Show"}</button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 8, lineHeight: 1.5 }}>
              Uses <strong style={{ color: "var(--text2)" }}>b-graph.facebook.com</strong> + doc_id <code style={{ fontSize: 10, background: "var(--bg)", padding: "1px 4px", borderRadius: 3 }}>1477043292367183</code>
            </p>
          </div>
        )}

        {/* What Guard does */}
        <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Shield size={15} color="#8b5cf6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6" }}>Facebook Profile Guard</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
            Profile Guard prevents others from <strong style={{ color: "var(--text)" }}>downloading, sharing, or screenshotting</strong> your profile picture.
            It adds a blue shield ring around your photo.
          </div>
        </div>

        {/* Toggle */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px", marginBottom: 14, boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 10, letterSpacing: "0.08em" }}>ACTION</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setGuardOn(true)}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: "var(--radius-sm)",
                border: `2px solid ${guardOn ? "#8b5cf6" : "var(--border)"}`,
                background: guardOn ? "rgba(139,92,246,0.1)" : "var(--bg)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                cursor: "pointer", transition: "all 0.15s", color: "var(--text)", fontFamily: "inherit",
              }}
            >
              <Shield size={22} color={guardOn ? "#8b5cf6" : "var(--text3)"} />
              <span style={{ fontSize: 13, fontWeight: 700, color: guardOn ? "#8b5cf6" : "var(--text3)" }}>Enable</span>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>Turn on guard</span>
            </button>
            <button
              onClick={() => setGuardOn(false)}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: "var(--radius-sm)",
                border: `2px solid ${!guardOn ? "#e41c2e" : "var(--border)"}`,
                background: !guardOn ? "rgba(228,28,46,0.08)" : "var(--bg)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                cursor: "pointer", transition: "all 0.15s", color: "var(--text)", fontFamily: "inherit",
              }}
            >
              <ShieldOff size={22} color={!guardOn ? "#e41c2e" : "var(--text3)"} />
              <span style={{ fontSize: 13, fontWeight: 700, color: !guardOn ? "#e41c2e" : "var(--text3)" }}>Disable</span>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>Remove guard</span>
            </button>
          </div>
        </div>

        {/* Status */}
        {status !== "idle" && (
          <div className={`result-box ${status === "success" ? "success" : "error"}`}>
            {status === "success"
              ? <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6 }} />
              : <XCircle size={14} style={{ display: "inline", marginRight: 6 }} />
            }
            {modal?.message.split("\n").map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </div>
        )}

        {/* Run button */}
        <button
          className="lara-btn lara-btn-primary"
          style={{ marginBottom: 14, background: guardOn ? "#8b5cf6" : "#e41c2e", borderRadius: "var(--radius-sm)", opacity: canSubmit ? 1 : 0.5 }}
          onClick={handleGuard}
          disabled={loading || !canSubmit}
        >
          {loading
            ? <><span className="spin" /> {guardOn ? "Enabling..." : "Disabling..."}</>
            : <>{guardOn ? <Shield size={16} /> : <ShieldOff size={16} />} {guardOn ? "Enable Profile Guard" : "Disable Profile Guard"}</>
          }
        </button>

        {/* Logs */}
        {logs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 6, letterSpacing: "0.08em" }}>DEBUG LOG</p>
            <LogWindow logs={logs} />
          </div>
        )}

        {/* Info box — manual fallback */}
        <div style={{ background: "rgba(24,119,242,0.06)", border: "1px solid rgba(24,119,242,0.2)", borderRadius: "var(--radius)", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <Info size={14} color="var(--primary)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>Manual Backup Method</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
            If the auto method fails (Facebook blocks API access):
          </p>
          <ol style={{ paddingLeft: 16, fontSize: 12, color: "var(--text2)", lineHeight: 2.1, marginTop: 6 }}>
            <li>Open <strong style={{ color: "var(--text)" }}>Facebook</strong> app on phone</li>
            <li>Go to your profile → tap your photo</li>
            <li>Tap <strong style={{ color: "var(--text)" }}>⋯</strong> (3 dots) → <strong style={{ color: "var(--text)" }}>Turn on Profile Guard</strong></li>
          </ol>
        </div>

        {/* API methods note */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 12, marginBottom: 14, padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <AlertCircle size={13} color="var(--text3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6 }}>
            {mode === "email"
              ? "Email mode: b-graph.facebook.com login → graph.facebook.com/graphql turn_shield (doc_id 1477043292367183)"
              : "Cookie mode: tries token-based turn_shield first, then 9 fallback methods (mbasic, GraphQL, AJAX, Graph API, photo page)"}
          </p>
        </div>
      </div>
    </div>
  );
}
