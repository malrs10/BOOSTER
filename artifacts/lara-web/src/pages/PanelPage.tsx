import { useState, useEffect } from "react";
import { ThumbsUp, Share2, MessageSquare, KeyRound, Shield, Users, ChevronRight, LogOut, Zap, Activity, Clock, TrendingUp } from "lucide-react";
import type { Profile, Tool } from "@/App";
import { api } from "@/lib/api";

interface Props {
  profile: Profile;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
  accountCount: number;
}

const TOOLS: { id: Tool; Icon: typeof ThumbsUp; label: string; desc: string; color: string; bg: string }[] = [
  { id: "react",   Icon: ThumbsUp,       label: "Auto React",    desc: "Boost reactions on any post · 7 types",       color: "#e41c2e", bg: "rgba(228,28,46,0.1)"  },
  { id: "share",   Icon: Share2,         label: "Spam Share",    desc: "Multiply shares fast · Up to 20×",             color: "#1877F2", bg: "rgba(24,119,242,0.1)" },
  { id: "comment", Icon: MessageSquare,  label: "Mass Comment",  desc: "Post bulk comments from all accounts",          color: "#42b72a", bg: "rgba(66,183,42,0.1)"  },
  { id: "token",   Icon: KeyRound,       label: "Access Token",  desc: "Extract EAAG token from session",               color: "#f5c518", bg: "rgba(245,197,24,0.1)" },
  { id: "guard",   Icon: Shield,         label: "Profile Guard", desc: "Enable Facebook photo protection",              color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];

function StatCard({ label, value, Icon, color }: { label: string; value: string | number; Icon: typeof Zap; color: string }) {
  return (
    <div style={{
      flex: 1, background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "11px 8px", textAlign: "center",
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 7px" }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export default function PanelPage({ profile, onSelect, onLogout, accountCount }: Props) {
  const isAuth = profile.authenticated;
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;
  const [accounts, setAccounts] = useState<{ uid: string; name: string; avatar: string; active: boolean }[]>([]);

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  const activeCount = accounts.filter(a => a.active).length;

  return (
    <div className="fb-page">

      {/* ── Profile hero ── */}
      <div style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "20px 16px 18px", textAlign: "center",
        boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
          <img
            src={profile.avatar} alt={displayName}
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1877F2&color=fff&size=80`; }}
          />
          <div style={{
            position: "absolute", bottom: 2, right: 2,
            width: 18, height: 18, borderRadius: "50%",
            background: isAuth ? "#42b72a" : "#f5c518",
            border: "2.5px solid var(--card)",
            boxShadow: isAuth ? "0 0 8px rgba(66,183,42,0.5)" : "none",
          }} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>{displayName}</h2>
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10, fontFamily: "monospace" }}>UID: {profile.uid}</p>

        {isAuth ? (
          <span className="badge badge-success"><span className="dot dot-green dot-pulse" /> Authenticated</span>
        ) : (
          <span className="badge badge-warning"><span className="dot dot-yellow" /> Cookie Active</span>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ padding: "12px 12px 0", display: "flex", gap: 8 }}>
        <StatCard label="Saved"    value={accounts.length}                   Icon={Users}     color="#1877F2" />
        <StatCard label="Active"   value={activeCount}                        Icon={Activity}  color="#42b72a" />
        <StatCard label="Max"      value={`${Math.min(activeCount, 20)}×`}   Icon={TrendingUp} color="#e41c2e" />
        <StatCard label="Cooldown" value="10m"                                Icon={Clock}     color="#f5c518" />
      </div>

      {/* ── Active accounts preview ── */}
      {accounts.length > 0 && (
        <div style={{ margin: "10px 12px 0", padding: "11px 14px", background: "rgba(24,119,242,0.07)", border: "1px solid rgba(24,119,242,0.2)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Users size={14} color="var(--primary)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{activeCount} Active Account{activeCount !== 1 ? "s" : ""}</span>
            </div>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>Max 20 per batch</span>
          </div>
          <div style={{ display: "flex" }}>
            {accounts.filter(a => a.active).slice(0, 8).map((acc, i) => (
              <div key={acc.uid} style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--card)", marginLeft: i === 0 ? 0 : -6, zIndex: 8 - i, background: "var(--bg3)" }}>
                <img src={acc.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${acc.name[0]}&background=1877F2&color=fff&size=26`; }} />
              </div>
            ))}
            {accounts.filter(a => a.active).length > 8 && (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--primary)", border: "2px solid var(--card)", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>
                +{accounts.filter(a => a.active).length - 8}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tools list ── */}
      <div style={{ padding: "14px 12px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 10, letterSpacing: "0.1em" }}>TOOLS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TOOLS.map(({ id, Icon, label, desc, color, bg }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="tool-card active-press"
              style={{ borderLeft: `3.5px solid ${color}` }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: bg, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={21} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{desc}</div>
              </div>
              <ChevronRight size={16} color="var(--text3)" />
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="lara-btn lara-btn-danger" style={{ marginTop: 18, borderRadius: "var(--radius-sm)", fontSize: 14 }}>
          <LogOut size={14} /> Switch Account
        </button>

        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 10, marginTop: 16, letterSpacing: "0.04em" }}>
          RPW BOOSTER v1.5.1 · Use responsibly
        </p>
      </div>
    </div>
  );
}
