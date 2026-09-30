import {NavLink, Outlet, Link} from "react-router-dom";
import {useAuth} from "../context/useAuth";

export default function AppLayout() {
  const {user, logout} = useAuth();
  return (
    <div className="app-shell">
      <header className="navbar">
        <Link className="wordmark" to="/">
          <span className="wordmark-mark">L</span>
          <span>LEXORA</span>
        </Link>
        <nav className="main-nav">
          <NavLink to="/">Trang chủ</NavLink>
          <NavLink to="/explore">Khám phá</NavLink>
          {user && <NavLink to="/library">Thư viện của tôi</NavLink>}
          {user && <NavLink to="/classes">Lớp học</NavLink>}
          {user && <NavLink to="/weak-words">⚠️ Từ yếu</NavLink>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <NavLink className="profile-chip" to="/profile">
                <span>
                  {(user.full_name || user.username).slice(0, 1).toUpperCase()}
                </span>
                {user.full_name || user.username}
              </NavLink>
              <button className="nav-logout" onClick={logout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">
                Đăng nhập
              </Link>
              <Link className="button-small" to="/register">
                Đăng ký miễn phí
              </Link>
            </>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <span>LEXORA / học từ vựng mỗi ngày</span>
        <span>Tiến bộ đều đặn.</span>
      </footer>
    </div>
  );
}
