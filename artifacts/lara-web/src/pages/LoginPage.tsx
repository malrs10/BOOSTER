import { useState } from "react";
import { ThumbsUp, Share2, MessageSquare, Shield, LogIn, ChevronDown, ChevronUp, KeyRound, Zap } from "lucide-react";
import { api, type FbProfile } from "@/lib/api";

interface Props { onLogin: (profile: FbProfile, cookie: string) => void; }

const FIELDS = ["c_user", "xs", "datr", "fr", "sb"];

const FEATURES = [
  { Icon: ThumbsUp,      label: "Auto React",    desc: "7 types · 20 accounts",    color: "#e41c2e", bg: "rgba(228,28,46,0.1)"   },
  { Icon: Share2,        label: "Spam Share",     desc: "Multi shares · Up to 20×", color: "#1877F2", bg: "rgba(24,119,242,0.1)"  },
  { Icon: MessageSquare, label: "Mass Comment",   desc: "Bulk · Max 10 each",       color: "#42b72a", bg: "rgba(66,183,42,0.1)"   },
  { Icon: Shield,        label: "Profile Guard",  desc: "Photo protection",          color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  { Icon: KeyRound,      label: "Access Token",   desc: "EAAG extractor",            color: "#f5c518", bg: "rgba(245,197,24,0.1)"  },
  { Icon: Zap,           label: "Bulk Boost",     desc: "20 accounts · 10-min CD",  color: "#1877F2", bg: "rgba(24,119,242,0.1)"  },
];

function FbWordmark() {
  return (
    <svg height="36" viewBox="0 0 327 65" fill="var(--primary)">
      <path clipRule="evenodd" d="M17.0833 0.5H309.917C319.006 0.5 326.417 7.91068 326.417 17V48C326.417 57.0893 319.006 64.5 309.917 64.5H17.0833C7.994 64.5 0.583328 57.0893 0.583328 48V17C0.583328 7.91068 7.994 0.5 17.0833 0.5Z" fill="none"/>
      <path d="M52.6 32.5c0-11.3-9.2-20.5-20.5-20.5S11.6 21.2 11.6 32.5c0 10.2 7.5 18.7 17.3 20.2V38.2h-5.2v-5.7h5.2v-4.4c0-5.2 3.1-8 7.8-8 2.3 0 4.6.4 4.6.4v5h-2.6c-2.6 0-3.4 1.6-3.4 3.2v3.8h5.7l-.9 5.7h-4.8V52.7C45.1 51.2 52.6 42.7 52.6 32.5z" fill="var(--primary)"/>
      <text x="58" y="48" fontFamily="-apple-system,BlinkMacSystemFont,Helvetica Neue,Helvetica,Arial,sans-serif" fontWeight="700" fontSize="36" fill="var(--primary)">RPW Booster</text>
    </svg>
  );
}

export default function LoginPage({ onLogin }: Props) {
  const [cookie,    setCookie]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [showGuide, setShowGuide] = useState(false);

  async function handleLogin() {
    const c = cookie.trim();
    if (!c) { setError("Please paste your Facebook cookie first."); return; }
    if (!c.includes("c_user") || !c.includes("xs")) {
      setError("Cookie must include c_user and xs fields."); return;
    }
    setError(""); setLoading(true);
    try {
      const profile = await api.login(c);
      if (!profile.uid) { setError("Could not extract UID — paste the full cookie from facebook.com"); return; }
      onLogin(profile, c);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed — check your cookie");
    } finally { setLoading(false); }
  }

  const fieldsDetected = FIELDS.filter(f => cookie.includes(f));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 32 }}>

      {/* ── Facebook-style header ── */}
      <div style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "28px 20px 22px", textAlign: "center",
        boxShadow: "var(--shadow-card)",
      }}>
        {/* Facebook "f" icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "var(--primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
          boxShadow: "0 4px 20px rgba(24,119,242,0.35)",
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="#fff">
            <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 4, letterSpacing: "-0.01em" }}>
          RPW BOOSTER
        </h1>
        <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>
          Facebook Multi-Tool Suite · v1.5.1
        </p>
      </div>

      <div style={{ padding: "16px 16px 0", maxWidth: 480, margin: "0 auto" }}>

        {/* ── Login card ── */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 12, boxShadow: "var(--shadow-card)" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.08em" }}>
              FACEBOOK COOKIE
            </p>
            <button
              onClick={() => setShowGuide(g => !g)}
              style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", fontWeight: 600 }}
            >
              {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showGuide ? "Hide guide" : "How to get?"}
            </button>
          </div>

          {showGuide && (
            <div style={{ background: "rgba(24,119,242,0.06)", border: "1px solid rgba(24,119,242,0.18)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, marginBottom: 8 }}>Get your Facebook cookie:</p>
              <ol style={{ paddingLeft: 16, fontSize: 12, color: "var(--text2)", lineHeight: 2.1 }}>
                <li>Open <strong style={{ color: "var(--text)" }}>Facebook.com</strong> on PC (Chrome)</li>
                <li>Press <strong style={{ color: "var(--text)" }}>F12</strong> → Application → Cookies</li>
                <li>Select <strong style={{ color: "var(--text)" }}>https://www.facebook.com</strong></li>
                <li>Install <strong style={{ color: "var(--text)" }}>Cookie-Editor</strong> extension → Export → Header String</li>
              </ol>
              <div style={{ marginTop: 8, padding: "7px 11px", background: "var(--bg)", borderRadius: "var(--radius-sm)", fontFamily: "monospace", fontSize: 10, color: "var(--text3)", lineHeight: 1.7, border: "1px solid var(--border)" }}>
                c_user=123456; xs=abc:xyz:2; datr=xxx; fr=yyy; sb=zzz
              </div>
            </div>
          )}

          <textarea
            className="lara-input"
            rows={5}
            value={cookie}
            onChange={e => { setCookie(e.target.value); setError(""); }}
            placeholder={"Paste your Facebook cookie here...\n\nRequired: c_user + xs"}
            style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.7 }}
          />

          {/* Field detection badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
            {FIELDS.map(f => {
              const found = cookie.includes(f);
              return (
                <span key={f} className={`field-badge ${found ? "found" : "miss"}`}>
                  {found ? "✓" : "·"} {f}
                </span>
              );
            })}
            {fieldsDetected.length > 0 && (
              <span style={{ fontSize: 10, color: "var(--text3)", alignSelf: "center", marginLeft: 2 }}>
                {fieldsDetected.length}/{FIELDS.length} detected
              </span>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(228,28,46,0.07)", border: "1px solid rgba(228,28,46,0.2)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--red)" }}>
              {error}
            </div>
          )}

          <button
            className="lara-btn lara-btn-primary"
            style={{ marginTop: 14, borderRadius: "var(--radius-sm)", fontSize: 16 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading
              ? <><span className="spin" /> Verifying cookie...</>
              : <><LogIn size={17} /> Login with Cookie</>
            }
          </button>

          <p style={{ color: "var(--text3)", fontSize: 11, marginTop: 10, textAlign: "center", lineHeight: 1.6 }}>
            Cookie is used locally for boosting operations · No data shared externally
          </p>
        </div>

        {/* ── Divider ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>FEATURES</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* ── Feature grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {FEATURES.map(({ Icon, label, desc, color, bg }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--shadow-card)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}25` }}>
                <Icon size={17} color={color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 11, letterSpacing: "0.04em" }}>
          RPW BOOSTER · Philippines RPW & RA Tool
        </p>
      </div>
    </div>
  );
}
