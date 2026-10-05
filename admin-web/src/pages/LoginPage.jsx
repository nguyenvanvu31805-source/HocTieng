import {useState} from "react";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

export default function LoginPage() {
  const {login, loading} = useAuth();
  const [form, setForm] = useState({identifier: "", password: ""});
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <main className="login-page">
      <section className="login-aside">
        <span className="brand-mark large">🌱</span>
        <p className="eyebrow">HỆ THỐNG QUẢN TRỊ QUIZLETCLONE</p>
        <h1>Duy trì nhịp học tập.</h1>
        <p className="login-note">
          Bảng điều khiển tập trung để theo dõi người dùng, quản trị bộ học và thẻ từ vựng ổn định.
        </p>
        <div className="login-orbit">
          <span>QUẢN TRỊ</span>
          <span>BỘ HỌC</span>
          <span>NGƯỜI DÙNG</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-brand">
            <span className="brand-mark">🌱</span> QUIZLETCLONE QUẢN TRỊ
          </div>
          <p className="eyebrow">TRUY CẬP BẢO MẬT</p>
          <h2>Chào mừng trở lại</h2>
          <p className="muted">
            Đăng nhập bằng tài khoản quản trị viên để tiếp tục.
          </p>
          <form onSubmit={submit}>
            <label>
              Email hoặc tên đăng nhập
              <input
                required
                value={form.identifier}
                onChange={(event) =>
                  setForm({...form, identifier: event.target.value})
                }
                placeholder="admin@example.com hoặc admin"
                autoComplete="username"
              />
            </label>
            <label>
              Mật khẩu
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({...form, password: event.target.value})
                }
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="primary-button full" disabled={loading}>
              {loading ? "Đang xác thực..." : "Đăng nhập →"}
            </button>
          </form>
          <p className="form-footnote">
            Chỉ tài khoản có vai trò <b>QUẢN TRỊ VIÊN</b> mới được truy cập.
          </p>
        </div>
      </section>
    </main>
  );
}
