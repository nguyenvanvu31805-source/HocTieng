import {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";
import {getLabel, roleLabels, userStatusLabels} from "../utils/labels";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const roleOptions = [
  ["", "Tất cả vai trò"],
  ["ADMIN", "Quản trị viên"],
  ["TEACHER", "Giáo viên"],
  ["STUDENT", "Học viên"],
];
const statusOptions = [
  ["", "Tất cả trạng thái"],
  ["ACTIVE", "Đang hoạt động"],
  ["LOCKED", "Đã khóa"],
  ["BANNED", "Bị cấm"],
];

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [role, setRole] = useState(searchParams.get("role") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [state, setState] = useState({loading: true, error: ""});
  const [actionUserId, setActionUserId] = useState(null);
  const [notice, setNotice] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = () => {
    setState({loading: true, error: ""});
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (role) params.role = role;
    if (status) params.status = status;
    api
      .get("/users", {params})
      .then(({data}) => setUsers(data.data || []))
      .catch((error) =>
        setState({loading: false, error: getErrorMessage(error)}),
      )
      .finally(() => setState((current) => ({...current, loading: false})));
  };

  useEffect(() => {
    loadUsers();
  }, [searchParams]);

  const submitFilters = (event) => {
    event.preventDefault();
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (role) params.role = role;
    if (status) params.status = status;
    setSearchParams(params);
  };

  const updateStatus = async (user) => {
    const nextStatus = user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    const message =
      nextStatus === "LOCKED"
        ? "Bạn có chắc muốn khóa người dùng này không?"
        : "Bạn có chắc muốn mở khóa người dùng này không?";
    if (!window.confirm(message)) return;
    setActionUserId(user.user_id);
    setNotice("");
    try {
      await api.patch(`/users/${user.user_id}/status`, {status: nextStatus});
      setNotice(
        nextStatus === "LOCKED"
          ? "Đã khóa người dùng."
          : "Đã mở khóa người dùng.",
      );
      loadUsers();
      if (selectedUser?.user_id === user.user_id)
        setSelectedUser({...user, status: nextStatus});
    } catch (error) {
      setState((current) => ({...current, error: getErrorMessage(error)}));
    } finally {
      setActionUserId(null);
    }
  };

  const viewUser = async (userId) => {
    try {
      const {data} = await api.get(`/users/${userId}`);
      setSelectedUser(data.data);
    } catch (error) {
      setState((current) => ({...current, error: getErrorMessage(error)}));
    }
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DANH BẠ / NGƯỜI DÙNG</span>
          <h1>Người dùng</h1>
          <p className="muted">
            Quản lý tài khoản và trạng thái truy cập từ cơ sở dữ liệu.
          </p>
        </div>
        <span className="todo-badge">{users.length} NGƯỜI DÙNG</span>
      </div>
      <form className="user-filters" onSubmit={submitFilters}>
        <label>
          Tìm kiếm người dùng...
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên đăng nhập, email, họ tên..."
          />
        </label>
        <label>
          Vai trò
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {roleOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button">Tìm kiếm</button>
      </form>
      {notice && <div className="alert success">{notice}</div>}
      {state.error && <div className="alert error">Lỗi: {state.error}</div>}
      {state.loading ? (
        <section className="table-panel table-loading">
          Đang tải danh sách người dùng...
        </section>
      ) : users.length === 0 ? (
        <section className="empty-state">
          <span className="empty-code">TRỐNG / NGƯỜI DÙNG</span>
          <h2>Không tìm thấy người dùng</h2>
          <p className="muted">
            Không có tài khoản phù hợp với bộ lọc hiện tại.
          </p>
        </section>
      ) : (
        <section className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên đăng nhập</th>
                  <th>Email</th>
                  <th>Họ tên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Ngày cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td className="position-cell">#{user.user_id}</td>
                    <td>
                      <b>{user.username}</b>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.full_name || "—"}</td>
                    <td>
                      <span
                        className={`status-tag role-${user.role.toLowerCase()}`}
                      >
                        {getLabel(roleLabels, user.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-tag status-${user.status.toLowerCase()}`}
                      >
                        {getLabel(userStatusLabels, user.status)}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>{formatDate(user.updated_at)}</td>
                    <td>
                      <div className="row-actions user-actions">
                        <button
                          className="ghost-button"
                          onClick={() => viewUser(user.user_id)}
                        >
                          Xem
                        </button>
                        {user.status === "ACTIVE" && (
                          <button
                            className="danger-button"
                            disabled={actionUserId === user.user_id}
                            onClick={() => updateStatus(user)}
                          >
                            Khóa
                          </button>
                        )}
                        {(user.status === "LOCKED" ||
                          user.status === "BANNED") && (
                          <button
                            className="ghost-button"
                            disabled={actionUserId === user.user_id}
                            onClick={() => updateStatus(user)}
                          >
                            Mở khóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <section
            className="user-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <span className="panel-kicker">CHI TIẾT NGƯỜI DÙNG</span>
                <h2>{selectedUser.full_name || selectedUser.username}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            <div className="user-avatar-preview">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt={selectedUser.username}
                />
              ) : (
                selectedUser.username.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="detail-grid">
              <span>
                ID<strong>#{selectedUser.user_id}</strong>
              </span>
              <span>
                Tên đăng nhập<strong>{selectedUser.username}</strong>
              </span>
              <span>
                Email<strong>{selectedUser.email}</strong>
              </span>
              <span>
                Họ tên<strong>{selectedUser.full_name || "—"}</strong>
              </span>
              <span>
                Vai trò
                <strong>{getLabel(roleLabels, selectedUser.role)}</strong>
              </span>
              <span>
                Trạng thái
                <strong>
                  {getLabel(userStatusLabels, selectedUser.status)}
                </strong>
              </span>
              <span>
                Ngày tạo<strong>{formatDate(selectedUser.created_at)}</strong>
              </span>
              <span>
                Ngày cập nhật
                <strong>{formatDate(selectedUser.updated_at)}</strong>
              </span>
            </div>
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => setSelectedUser(null)}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
