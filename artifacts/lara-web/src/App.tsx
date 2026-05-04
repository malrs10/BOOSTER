import { useState, useEffect, useRef } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import LoginPage from "@/pages/LoginPage";
import PanelPage from "@/pages/PanelPage";
import ReactPage from "@/pages/ReactPage";
import SharePage from "@/pages/SharePage";
import CommentPage from "@/pages/CommentPage";
import TokenPage from "@/pages/TokenPage";
import GuardPage from "@/pages/GuardPage";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";

export interface Profile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
  token?: string;
  authenticated?: boolean;
  cookie: string;
}

export type Tool = "panel" | "react" | "share" | "comment" | "token" | "guard";

const SESSION_KEY = "rpw_session_v2";
const THEME_KEY   = "rpw_theme";

function loadSession(): Profile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p: Profile = JSON.parse(raw);
    if (p?.uid && p?.cookie) return p;
  } catch {}
  return null;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let animId: number;
    const pts: { x:number; y:number; r:number; vx:number; vy:number; a:number; c:string }[] = [];
    const cols = ["rgba(35,116,225,","rgba(66,183,42,","rgba(24,119,242,"];
    function resize(){ canvas!.width=window.innerWidth; canvas!.height=window.innerHeight; }
    resize(); window.addEventListener("resize",resize);
    for(let i=0;i<45;i++) pts.push({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,r:Math.random()*1.6+0.3,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2,a:Math.random()*.3+.04,c:cols[Math.floor(Math.random()*cols.length)]});
    function draw(){
      ctx!.clearRect(0,0,canvas!.width,canvas!.height);
      pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=canvas!.width;if(p.x>canvas!.width)p.x=0;if(p.y<0)p.y=canvas!.height;if(p.y>canvas!.height)p.y=0;ctx!.beginPath();ctx!.arc(p.x,p.y,p.r,0,Math.PI*2);ctx!.fillStyle=p.c+p.a+")";ctx!.fill();});
      animId=requestAnimationFrame(draw);
    }
    draw();
    return ()=>{cancelAnimationFrame(animId);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={canvasRef} id="particle-canvas" />;
}

/* ── Facebook "f" logo SVG ── */
function FbLogo({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function App() {
  const [profile,      setProfile]      = useState<Profile | null>(loadSession);
  const [tool,         setTool]         = useState<Tool>("panel");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [accountCount, setAccountCount] = useState(0);
  const [darkMode,     setDarkMode]     = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (profile) void fetchAccountCount();
  }, [profile]);

  async function fetchAccountCount() {
    try {
      const accounts = await api.getAccounts();
      setAccountCount(accounts.filter(a => a.active).length);
    } catch { /* silent */ }
  }

  function handleLogin(p: import("@/lib/api").FbProfile, cookie: string) {
    const newProfile: Profile = { ...p, cookie };
    setProfile(newProfile);
    setTool("panel");
    localStorage.setItem(SESSION_KEY, JSON.stringify(newProfile));
    void fetchAccountCount();
  }

  function handleLogout() {
    setProfile(null);
    setTool("panel");
    setSidebarOpen(false);
    localStorage.removeItem(SESSION_KEY);
  }

  const renderContent = () => {
    if (!profile) return null;
    switch (tool) {
      case "react":   return <ReactPage   profile={profile} onBack={() => setTool("panel")} accountCount={accountCount} />;
      case "share":   return <SharePage   profile={profile} onBack={() => setTool("panel")} />;
      case "comment": return <CommentPage profile={profile} onBack={() => setTool("panel")} accountCount={accountCount} />;
      case "token":   return <TokenPage   profile={profile} onBack={() => setTool("panel")} />;
      case "guard":   return <GuardPage   profile={profile} onBack={() => setTool("panel")} />;
      default:        return <PanelPage   profile={profile} onSelect={setTool} onLogout={handleLogout} accountCount={accountCount} />;
    }
  };

  const displayName = profile
    ? (profile.name.startsWith("User ") ? `UID ${profile.uid}` : profile.name)
    : "";

  return (
    <>
      <ParticleCanvas />
      <div className="lara-content">
        {!profile ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            {/* ── Facebook Navbar ── */}
            <nav className="rpw-navbar">
              <button className="rpw-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
                <Menu size={18} />
              </button>

              <div className="rpw-navbar-center">
                <div className="rpw-navbar-brand">
                  <div className="rpw-brand-logo">
                    <FbLogo size={16} color="#fff" />
                  </div>
                  RPW BOOSTER
                </div>
                <span className="rpw-version-badge">v1.5.1</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  className="theme-toggle-btn"
                  onClick={() => setDarkMode(d => !d)}
                  aria-label={darkMode ? "Light mode" : "Dark mode"}
                  title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button className="rpw-avatar-btn" onClick={() => setSidebarOpen(true)} aria-label="Profile">
                  <img
                    src={profile.avatar}
                    alt={displayName}
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1877F2&color=fff&size=64`;
                    }}
                  />
                </button>
              </div>
            </nav>

            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onSelect={(t) => { setTool(t); setSidebarOpen(false); }}
              onLogout={handleLogout}
              profile={profile}
              accountCount={accountCount}
              currentTool={tool}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(d => !d)}
            />

            <div className="rpw-main">
              {renderContent()}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
