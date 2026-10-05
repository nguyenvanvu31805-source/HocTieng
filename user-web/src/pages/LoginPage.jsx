import {useState} from "react";
import {Link} from "react-router-dom";
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
    <div className="auth-page">
      <div className="auth-art">
        <span className="wordmark-mark">🌱</span>
        <p className="eyebrow">QUAY LẠI VỚI QUIZLETCLONE</p>
        <h1>
          Tiếp tục
          <br />
          <em>học tập và phát triển.</em>
        </h1>
        <p>Phiên học ngắn, tiến bộ thực tế và củng cố phản xạ từ vựng mỗi ngày.</p>
      </div>
      <div className="auth-card">
        <p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p>
        <h2>Đăng nhập</h2>
        <p className="muted">Dùng email hoặc tên đăng nhập để tiếp tục.</p>
        <form onSubmit={submit}>
          <label>
            Email hoặc tên đăng nhập
            <input
              required
              value={form.identifier}
              onChange={(event) =>
                setForm({...form, identifier: event.target.value})
              }
              autoComplete="username"
              placeholder="you@example.com hoặc tên đăng nhập"
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
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="button-primary full" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập →"}
          </button>
        </form>
        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
        </p>
      </div>
    </div>
  );
}
