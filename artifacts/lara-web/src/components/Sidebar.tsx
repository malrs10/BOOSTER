import { X, ThumbsUp, Share2, MessageSquare, KeyRound, Shield, Users, LogOut, Sun, Moon } from "lucide-react";
import type { Profile, Tool } from "@/App";

function FbLogo({ size = 14, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

const TOOLS: { id: Tool; Icon: typeof ThumbsUp; label: string; desc: string; color: string; bg: string }[] = [
  { id: "react",   Icon: ThumbsUp,      label: "Auto React",    desc: "Boost reactions · 7 types",  color: "#e41c2e", bg: "rgba(228,28,46,0.12)"   },
  { id: "share",   Icon: Share2,        label: "Spam Share",    desc: "Multiple shares fast",        color: "#1877F2", bg: "rgba(24,119,242,0.12)"  },
  { id: "comment", Icon: MessageSquare, label: "Mass Comment",  desc: "Bulk comments · Max 10",      color: "#42b72a", bg: "rgba(66,183,42,0.12)"   },
  { id: "token",   Icon: KeyRound,      label: "Access Token",  desc: "Extract EAAG token",          color: "#f5c518", bg: "rgba(245,197,24,0.12)"  },
  { id: "guard",   Icon: Shield,        label: "Profile Guard", desc: "Protect profile photo",       color: "#1877F2", bg: "rgba(24,119,242,0.12)"  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (tool: Tool) => void;
  onLogout: () => void;
  profile: Profile;
  accountCount: number;
  currentTool: Tool;
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Sidebar({ open, onClose, onSelect, onLogout, profile, accountCount, currentTool, darkMode, onToggleDark }: Props) {
  const displayName = profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name;

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <div className={`sidebar-drawer${open ? " open" : ""}`}>

        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <FbLogo size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", letterSpacing: "0.02em" }}>RPW BOOSTER</div>
              <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.04em" }}>Facebook Multi-Tool v1.5.1</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Profile card */}
        <div className="sidebar-profile" onClick={onClose}>
          <img
            src={profile.avatar} alt={displayName}
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border)" }}
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1877F2&color=fff`; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "monospace", marginTop: 1 }}>UID: {profile.uid}</div>
          </div>
          <span className="dot dot-green dot-pulse" />
        </div>

        {/* Active accounts */}
        {accountCount > 0 && (
          <div style={{ margin: "4px 8px 0", padding: "7px 12px", background: "rgba(24,119,242,0.08)", border: "1px solid rgba(24,119,242,0.18)", borderRadius: 8, display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={13} color="var(--primary)" />
            <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>{accountCount} account{accountCount !== 1 ? "s" : ""} ready</span>
          </div>
        )}

        {/* Tools list */}
        <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
          <div className="sidebar-section-label">Tools</div>
          {TOOLS.map(({ id, Icon, label, desc, color, bg }) => (
            <button
              key={id}
              className={`sidebar-tool-btn${currentTool === id ? " active" : ""}`}
              onClick={() => onSelect(id)}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: currentTool === id ? bg : "var(--bg3)",
                border: `1.5px solid ${currentTool === id ? color + "30" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Icon size={16} color={currentTool === id ? color : "var(--text3)"} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: currentTool === id ? "var(--primary)" : "var(--text)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: "8px 8px 16px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onToggleDark}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text2)", cursor: "pointer", marginBottom: 6, fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}
          >
            {darkMode ? <Sun size={15} color="var(--text2)" /> : <Moon size={15} color="var(--text2)" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            className="lara-btn lara-btn-danger"
            style={{ fontSize: 13, fontWeight: 700, gap: 8, borderRadius: 8 }}
            onClick={onLogout}
          >
            <LogOut size={14} />
            Switch Account
          </button>
          <p style={{ textAlign: "center", fontSize: 10, color: "var(--text3)", marginTop: 10 }}>
            RPW BOOSTER · Philippines RPW & RA Tool
          </p>
        </div>
      </div>
    </>
  );
}
