import {useEffect, useState} from "react";
import api from "../services/api";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

const roleLabels = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};
const statusLabels = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  BANNED: "Bị cấm",
};
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";

export default function ProfilePage() {
  const {user, updateUser} = useAuth();
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    avatar_url: user?.avatar_url || "",
  });
  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: "",
    notice: "",
  });
  useEffect(() => {
    api
      .get("/auth/me")
      .then(({data}) => {
        setProfile(data.data);
        setForm({
          full_name: data.data.full_name || "",
          avatar_url: data.data.avatar_url || "",
        });
      })
      .catch((error) =>
        setState((current) => ({...current, error: getErrorMessage(error)})),
      )
      .finally(() => setState((current) => ({...current, loading: false})));
  }, []);
  const save = async (event) => {
    event.preventDefault();
    setState((current) => ({...current, saving: true, error: "", notice: ""}));
    try {
      const {data} = await api.patch("/auth/profile", form);
      setProfile(data.data);
      updateUser(data.data);
      setState((current) => ({
        ...current,
        notice: "Cập nhật hồ sơ thành công.",
      }));
    } catch {
      setState((current) => ({...current, error: "Không thể cập nhật hồ sơ."}));
    } finally {
      setState((current) => ({...current, saving: false}));
    }
  };
  if (state.loading)
    return (
      <div className="profile-page">
        <div className="empty-panel">Đang tải hồ sơ...</div>
      </div>
    );
  return (
    <div className="profile-page">
      <div className="library-page-heading">
        <div>
          <p className="eyebrow">TÀI KHOẢN</p>
          <h1>Hồ sơ cá nhân</h1>
          <p className="muted">
            Thông tin của bạn được lấy từ tài khoản hiện tại.
          </p>
        </div>
      </div>
      {state.error && <div className="form-error">{state.error}</div>}
      {state.notice && <div className="alert success">{state.notice}</div>}
      <section className="profile-layout">
        <div className="profile-summary">
          <div className="profile-large-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} />
            ) : (
              profile?.username?.slice(0, 1).toUpperCase()
            )}
          </div>
          <h2>{profile?.full_name || profile?.username}</h2>
          <p>{profile?.email}</p>
          <span className="status-tag role-student">
            {roleLabels[profile?.role] || profile?.role}
          </span>
          <div className="profile-facts">
            <span>
              Trạng thái
              <strong>
                {statusLabels[profile?.status] || profile?.status}
              </strong>
            </span>
            <span>
              Ngày tạo<strong>{formatDate(profile?.created_at)}</strong>
            </span>
          </div>
        </div>
        <form className="profile-form" onSubmit={save}>
          <div className="panel-kicker">CHỈNH SỬA THÔNG TIN</div>
          <label>
            Tên đăng nhập
            <input value={profile?.username || ""} disabled />
          </label>
          <label>
            Email
            <input value={profile?.email || ""} disabled />
          </label>
          <label>
            Họ và tên
            <input
              value={form.full_name}
              onChange={(event) =>
                setForm({...form, full_name: event.target.value})
              }
              placeholder="Nhập họ và tên"
            />
          </label>
          <label>
            Đường dẫn ảnh đại diện
            <input
              value={form.avatar_url}
              onChange={(event) =>
                setForm({...form, avatar_url: event.target.value})
              }
              placeholder="https://..."
            />
          </label>
          <button className="button-primary" disabled={state.saving}>
            {state.saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </section>
    </div>
  );
}
