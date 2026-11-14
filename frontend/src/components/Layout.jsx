
import { NavLink, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  Users,
  FileSearch,
  LogOut,
  Sparkles,
  History,
} from "lucide-react";
import "./Layout.css";

function Layout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

   const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs", path: "/jobs", icon: BriefcaseBusiness },
    { name: "Candidates", path: "/candidates", icon: Users },
    { name: "AI Screening", path: "/screening", icon: FileSearch },
    { name: "Screening History", path: "/screening-history", icon: History },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={25} />
          </div>
          <div>
            <h2>HireSense AI</h2>
            <span>Recruitment Intelligence</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user.name || "R").charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <strong>{user.name || "Recruiter"}</strong>
              <span>Recruiter Account</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="top-header">
          <div>
            <span className="header-label">HIRING WORKSPACE</span>
            <h3>Recruitment Dashboard</h3>
          </div>

          <div className="header-right">
            <Sparkles size={19} />
            <span>AI-Powered Hiring</span>
          </div>
        </header>

        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}

export default Layout;
