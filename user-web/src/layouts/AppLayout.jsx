import {NavLink, Outlet, Link} from "react-router-dom";
import {useAuth} from "../context/useAuth";

export default function AppLayout() {
  const {user, logout} = useAuth();
  const isTeacher = user?.role === "TEACHER";

  return (
    <div className="app-shell">
      <header className="navbar">
        <Link className="wordmark" to="/">
          <span className="wordmark-mark">🌱</span>
          <div className="wordmark-text-wrap">
            <span className="wordmark-title">QuizletClone</span>
            <span className="wordmark-tagline">Learn smarter</span>
          </div>
        </Link>

        <nav className="main-nav">
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/explore">Khám phá</NavLink>
          {user && <NavLink to="/library">Thư viện</NavLink>}
          {user && <NavLink to="/classes">Lớp học</NavLink>}
          {user && <NavLink to="/my-learning">Lịch sử học</NavLink>}
          {user && <NavLink to="/weak-words">⚠️ Từ yếu</NavLink>}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              {isTeacher && (
                <span className="teacher-role-pill">
                  👨‍🏫 Giáo viên
                </span>
              )}
              <NavLink className="profile-chip" to="/profile">
                <span className="profile-chip-avatar">
                  {(user.full_name || user.username).slice(0, 1).toUpperCase()}
                </span>
                <span className="profile-chip-name">
                  {user.full_name || user.username}
                </span>
              </NavLink>
              <button className="nav-logout" onClick={logout} title="Đăng xuất">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">
                Đăng nhập
              </Link>
              <Link className="button-small button-lime" to="/register">
                Bắt đầu học ngay →
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="main-content-wrap">
        <Outlet />
      </main>

      <footer className="footer-bar">
        <div className="footer-left">
          <span className="footer-brand">🌱 QuizletClone</span>
          <span className="footer-sep">·</span>
          <span className="footer-tagline">Learn smarter. Grow every day.</span>
        </div>
        <div className="footer-right">
          <span>Tiến bộ mỗi ngày qua từng phiên học thực tế</span>
        </div>
      </footer>
    </div>
  );
}
