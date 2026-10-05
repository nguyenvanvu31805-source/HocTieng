import {NavLink, Outlet} from "react-router-dom";
import {useAuth} from "../context/useAuth";

const navItems = [
  ["/dashboard", "Tổng quan", "01"],
  ["/users", "Người dùng", "02"],
  ["/study-sets", "Bộ học", "03"],
  ["/cards", "Thẻ từ vựng", "04"],
];

export default function AdminLayout() {
  const {user, logout} = useAuth();
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🌱</span>
          <div className="brand-text">
            <span>QuizletClone</span>
            <small>QUẢN TRỊ</small>
          </div>
        </div>
        <div className="sidebar-label">Khu vực làm việc</div>
        <nav className="nav-list">
          {navItems.map(([to, label, number]) => (
            <NavLink
              key={to}
              to={to}
              className={({isActive}) => `nav-item ${isActive ? "active" : ""}`}
            >
              <span>{number}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot">API đang hoạt động</div>
          <button className="logout-link" onClick={logout}>
            ↪ Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">BẢNG ĐIỀU KHIỂN QUẢN TRỊ</span>
            <span className="breadcrumb"> / vận hành học tập</span>
          </div>
          <div className="profile">
            <div className="avatar">
              {user?.username?.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{user?.full_name || user?.username}</strong>
              <small>Quản trị viên</small>
            </div>
            <button className="icon-button" onClick={logout} title="Đăng xuất">
              ↪
            </button>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
