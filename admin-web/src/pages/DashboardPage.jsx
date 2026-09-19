import {useEffect, useState} from "react";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";

const metricConfig = [
  ["01", "Tổng số người dùng", "total_users"],
  ["02", "Tổng số bộ học", "total_study_sets"],
  ["03", "Tổng số thẻ từ vựng", "total_cards"],
  ["04", "Tổng số phiên học", "total_study_sessions"],
  ["05", "Tổng số kết quả kiểm tra", "total_test_results"],
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [state, setState] = useState({loading: true, error: ""});
  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then(({data}) => setStats(data.data))
      .catch((error) =>
        setState({loading: false, error: getErrorMessage(error)}),
      )
      .finally(() => setState((current) => ({...current, loading: false})));
  }, []);
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TỔNG QUAN / HÔM NAY</span>
          <h1>Tổng quan</h1>
          <p className="muted">
            Thống kê thật từ cơ sở dữ liệu qua API quản trị.
          </p>
        </div>
        <div className={`api-pill ${state.error ? "offline" : "online"}`}>
          <span />{" "}
          {state.loading
            ? "Đang tải thống kê"
            : state.error
              ? "Không tải được thống kê"
              : "Dữ liệu trực tiếp"}
        </div>
      </div>
      {state.error && <div className="alert error">{state.error}</div>}
      {state.loading ? (
        <section className="metric-grid">
          {metricConfig.map(([number, title]) => (
            <article className="metric-card" key={title}>
              <span className="metric-number">{number}</span>
              <span className="metric-title">{title}</span>
              <strong>...</strong>
              <small>Đang tải dữ liệu</small>
            </article>
          ))}
        </section>
      ) : (
        <section className="metric-grid">
          {metricConfig.map(([number, title, key]) => (
            <article className="metric-card" key={title}>
              <span className="metric-number">{number}</span>
              <span className="metric-title">{title}</span>
              <strong>{stats?.[key] ?? 0}</strong>
              <small>Từ MySQL</small>
            </article>
          ))}
        </section>
      )}
      <section className="dashboard-grid">
        <article className="feature-panel">
          <div className="panel-kicker">TRẠNG THÁI HỆ THỐNG</div>
          <h2>Thống kê cơ sở dữ liệu</h2>
          <p className="muted">
            Các số liệu được lấy từ người dùng, bộ học, thẻ từ, phiên học và kết
            quả kiểm tra trong một lần gọi API.
          </p>
          <div className="pulse-line">
            <span className={`pulse ${state.error ? "" : "active"}`} />
            <b>{state.error ? "Cần kiểm tra" : "Đang hoạt động"}</b>
            <span className="muted">/api/dashboard/stats</span>
          </div>
        </article>
        <article className="todo-panel">
          <div className="panel-kicker">NGUỒN DỮ LIỆU</div>
          <h2>Dữ liệu thật</h2>
          <p className="muted">
            Tổng quan không dùng số liệu cố định. Khi cơ sở dữ liệu thay đổi, số
            liệu sẽ cập nhật khi tải lại trang.
          </p>
        </article>
      </section>
    </div>
  );
}
