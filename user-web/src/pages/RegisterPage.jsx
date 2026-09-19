import {useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

export default function RegisterPage() {
  const {register, loading} = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await register(form);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-art register-art">
        <span className="wordmark-mark">L</span>
        <p className="eyebrow">MỞ RA KHÔNG GIAN TÒ MÒ</p>
        <h1>
          Một thói quen
          <br />
          <em>học tốt hơn.</em>
        </h1>
        <p>Tạo hồ sơ học tập và biến mỗi từ mới thành một bước tiến.</p>
      </div>
      <div className="auth-card">
        <p className="eyebrow">BẮT ĐẦU NGAY</p>
        <h2>Tạo tài khoản</h2>
        <p className="muted">Tài khoản mới sẽ có vai trò Học viên.</p>
        <form onSubmit={submit}>
          <label>
            Họ và tên
            <input
              required
              value={form.full_name}
              onChange={(event) =>
                setForm({...form, full_name: event.target.value})
              }
              placeholder="Nhập họ và tên"
            />
          </label>
          <label>
            Tên đăng nhập
            <input
              required
              value={form.username}
              onChange={(event) =>
                setForm({...form, username: event.target.value})
              }
              placeholder="nguoi_hoc_tu_vung"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({...form, email: event.target.value})
              }
              placeholder="you@example.com"
            />
          </label>
          <label>
            Mật khẩu
            <input
              required
              minLength="6"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({...form, password: event.target.value})
              }
              placeholder="Ít nhất 6 ký tự"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="button-primary full" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo tài khoản →"}
          </button>
        </form>
        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
