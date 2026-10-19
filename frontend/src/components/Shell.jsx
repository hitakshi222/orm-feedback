import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, ArrowUpRight, Building2, ChevronDown, ClipboardList, Command, FileText, Headphones, LayoutDashboard, LogOut, Package, Users } from "lucide-react";
import { useEffect } from "react";
import { prefetchMasterData } from "../pages/Masters";
import { useAuth } from "../state/AuthContext";

function preloadMaster(type) {
  if (!type) return;
  prefetchMasterData(type)
    .catch((error) => console.error(`Unable to preload ${type} directory`, error));
}

const adminLinks = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/feedbacks", label: "Feedback inbox", icon: ClipboardList },
  { to: "/clients", label: "Clients", icon: Building2, preloadType: "clients" },
  { to: "/engineers", label: "Engineers", icon: Users, preloadType: "engineers" },
  { to: "/products", label: "Products", icon: Package, preloadType: "products" },
];
const clientLinks = [
  { to: "/my-feedback", label: "My feedback", icon: FileText },
  { to: "/new-feedback", label: "Share feedback", icon: ArrowUpRight },
];
const engineerLinks = [
  { to: "/engineer", label: "My dashboard", icon: LayoutDashboard },
  { to: "/feedbacks", label: "Feedback inbox", icon: ClipboardList },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = location.pathname.split("/")[1]?.replace("-", " ") || "overview";
  const links = user?.role === "client" ? clientLinks : user?.role === "engineer" ? engineerLinks : adminLinks;
  useEffect(() => {
    if (user?.role !== "admin") return undefined;
    const timer = window.setTimeout(() => preloadMaster("engineers"), 0);
    return () => window.clearTimeout(timer);
  }, [user?.role]);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><Command size={19} strokeWidth={2.3} /></div>
        <div><strong>BIYANI<span>.</span></strong><small>TECHNOLOGIES</small></div>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">{links.map(({ to, label, icon: Icon, preloadType }) =>
        <NavLink key={to} to={to} onMouseEnter={() => preloadMaster(preloadType)} onFocus={() => preloadMaster(preloadType)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
          {label === "Feedback inbox" && <span className="nav-dot" />}
        </NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><Headphones size={17} /></div><strong>Need a hand?</strong>
          <p>Our team is just a message away.</p><a href="mailto:support@biyani.com">Get support <ArrowUpRight size={13} /></a>
        </div>
        <div className="profile-mini"><div className="avatar">{user?.username?.slice(0, 1).toUpperCase() || "B"}</div>
          <div className="profile-info"><strong>{user?.username}</strong><span>{user?.role}</span></div>
          <button className="icon-btn logout-btn" onClick={logout} title="Sign out"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="crumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div>
        <div className="topbar-right"><div className="live-indicator"><span /> All systems operational</div>
          <div className="topbar-user"><div className="avatar avatar-small">{user?.username?.slice(0, 1).toUpperCase()}</div>
            <span>{user?.username}</span><ChevronDown size={14} /></div>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
