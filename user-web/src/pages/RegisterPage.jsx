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
    role: "STUDENT",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.role || (form.role !== "STUDENT" && form.role !== "TEACHER")) {
      setError("Vui lòng chọn vai trò: Học viên hoặc Giáo viên.");
      return;
    }

    if (form.password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      await register(form);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-art register-art">
        <span className="wordmark-mark">🌱</span>
        <p className="eyebrow">THAM GIA CÙNG QUIZLETCLONE</p>
        <h1>
          Learn smarter.
          <br />
          <em>Grow every day.</em>
        </h1>
        <p>Tạo tài khoản học tập, luyện từ vựng bền bỉ và theo dõi sự tiến bộ mỗi ngày.</p>
      </div>
      <div className="auth-card">
        <p className="eyebrow">BẮT ĐẦU NGAY</p>
        <h2>Tạo tài khoản</h2>
        <p className="muted">
          {form.role === "TEACHER"
            ? "Đăng ký tài khoản Giáo viên để quản lý lớp học và bài tập."
            : "Đăng ký tài khoản Học viên để học và luyện tập từ vựng."}
        </p>
        <form onSubmit={submit}>
          <div className="role-selection-group">
            <span className="role-selection-label">Bạn muốn đăng ký với vai trò nào?</span>
            <div className="role-cards">
              <button
                type="button"
                className={`role-card ${form.role === "STUDENT" ? "selected" : ""}`}
                onClick={() => setForm({...form, role: "STUDENT"})}
              >
                <span className="role-card-title">HỌC VIÊN</span>
                <span className="role-card-desc">Học và luyện tập</span>
              </button>
              <button
                type="button"
                className={`role-card ${form.role === "TEACHER" ? "selected" : ""}`}
                onClick={() => setForm({...form, role: "TEACHER"})}
              >
                <span className="role-card-title">GIÁO VIÊN</span>
                <span className="role-card-desc">Quản lý lớp học</span>
              </button>
            </div>
          </div>

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
          <label>
            Xác nhận mật khẩu
            <input
              required
              minLength="6"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu"
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
