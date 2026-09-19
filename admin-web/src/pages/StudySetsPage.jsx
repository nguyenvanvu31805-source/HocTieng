import {useEffect, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";
import {
  getLabel,
  studySetStatusLabels,
  studySetVisibilityLabels,
} from "../utils/labels";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const statusOptions = [
  ["", "Tất cả trạng thái"],
  ["ACTIVE", "Đang hoạt động"],
  ["HIDDEN", "Đã ẩn"],
  ["DELETED", "Đã xóa"],
];

export default function StudySetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [studySets, setStudySets] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [state, setState] = useState({loading: true, error: ""});
  const [selectedSet, setSelectedSet] = useState(null);
  const [notice, setNotice] = useState("");

  const loadStudySets = () => {
    setState({loading: true, error: ""});
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    api
      .get("/study-sets", {params})
      .then(({data}) => setStudySets(data.data || []))
      .catch((error) =>
        setState({loading: false, error: getErrorMessage(error)}),
      )
      .finally(() => setState((current) => ({...current, loading: false})));
  };

  useEffect(() => {
    loadStudySets();
  }, [searchParams]);

  const submitSearch = (event) => {
    event.preventDefault();
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    setSearchParams(params);
  };

  const changeStatus = async (studySet) => {
    const nextStatus = studySet.status === "HIDDEN" ? "ACTIVE" : "HIDDEN";
    const message =
      nextStatus === "HIDDEN"
        ? "Bạn có chắc chắn muốn ẩn bộ học này không?"
        : "Bạn có chắc chắn muốn hiện lại bộ học này không?";
    if (!window.confirm(message)) return;
    setNotice("");
    try {
      await api.patch(`/study-sets/${studySet.set_id}/status`, {
        status: nextStatus,
      });
      setNotice(
        nextStatus === "HIDDEN" ? "Đã ẩn bộ học." : "Đã hiện lại bộ học.",
      );
      loadStudySets();
      setSelectedSet(null);
    } catch (error) {
      setState((current) => ({...current, error: getErrorMessage(error)}));
    }
  };

  const deleteStudySet = async (studySet) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa bộ học này không? Các thẻ liên quan có thể bị xóa theo nếu khóa ngoại đang dùng ON DELETE CASCADE.",
      )
    )
      return;
    setNotice("");
    try {
      await api.delete(`/study-sets/${studySet.set_id}`);
      setNotice("Đã xóa bộ học.");
      loadStudySets();
      setSelectedSet(null);
    } catch (error) {
      setState((current) => ({...current, error: getErrorMessage(error)}));
    }
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ / BỘ HỌC</span>
          <h1>Bộ học</h1>
          <p className="muted">Quản lý vòng đời bộ học bằng dữ liệu thật.</p>
        </div>
        <span className="todo-badge">{studySets.length} BỘ HỌC</span>
      </div>
      <form className="study-set-filters" onSubmit={submitSearch}>
        <label>
          Tìm kiếm
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tiêu đề, mô tả, danh mục..."
          />
        </label>
        <label>
          Bộ lọc trạng thái
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
          Đang tải bộ học...
        </section>
      ) : studySets.length === 0 ? (
        <section className="empty-state">
          <span className="empty-code">TRỐNG / BỘ HỌC</span>
          <h2>Không tìm thấy bộ học</h2>
          <p className="muted">Không có dữ liệu phù hợp với bộ lọc hiện tại.</p>
        </section>
      ) : (
        <section className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tiêu đề</th>
                  <th>Người tạo</th>
                  <th>Danh mục</th>
                  <th>Ngôn ngữ</th>
                  <th>Quyền riêng tư</th>
                  <th>Trạng thái</th>
                  <th>Thẻ</th>
                  <th>Ngày tạo</th>
                  <th>Ngày cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {studySets.map((studySet) => (
                  <tr key={studySet.set_id}>
                    <td className="position-cell">#{studySet.set_id}</td>
                    <td>
                      <b>{studySet.title}</b>
                      <small>{studySet.description || "Chưa có mô tả"}</small>
                    </td>
                    <td>
                      {studySet.creator_full_name ||
                        studySet.creator_username ||
                        `Người dùng #${studySet.creator_id}`}
                    </td>
                    <td>{studySet.category || "—"}</td>
                    <td>{studySet.language || "—"}</td>
                    <td>
                      {getLabel(studySetVisibilityLabels, studySet.visibility)}
                    </td>
                    <td>
                      <span
                        className={`status-tag status-${studySet.status.toLowerCase()}`}
                      >
                        {getLabel(studySetStatusLabels, studySet.status)}
                      </span>
                    </td>
                    <td>{studySet.card_count}</td>
                    <td>{formatDate(studySet.created_at)}</td>
                    <td>{formatDate(studySet.updated_at)}</td>
                    <td>
                      <div className="row-actions study-set-actions">
                        <button
                          className="ghost-button"
                          onClick={() => setSelectedSet(studySet)}
                        >
                          Xem
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() =>
                            navigate(`/cards?setId=${studySet.set_id}`)
                          }
                        >
                          Thẻ
                        </button>
                        {studySet.status !== "DELETED" && (
                          <button
                            className="ghost-button"
                            onClick={() => changeStatus(studySet)}
                          >
                            {studySet.status === "HIDDEN" ? "Hiện" : "Ẩn"}
                          </button>
                        )}
                        <button
                          className="danger-button"
                          onClick={() => deleteStudySet(studySet)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {selectedSet && (
        <div className="modal-backdrop" onClick={() => setSelectedSet(null)}>
          <section
            className="study-set-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <span className="panel-kicker">CHI TIẾT BỘ HỌC</span>
                <h2>{selectedSet.title}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setSelectedSet(null)}
              >
                ×
              </button>
            </div>
            <div className="detail-grid">
              <span>
                Người tạo
                <strong>
                  {selectedSet.creator_full_name ||
                    selectedSet.creator_username ||
                    `Người dùng #${selectedSet.creator_id}`}
                </strong>
              </span>
              <span>
                Danh mục<strong>{selectedSet.category || "—"}</strong>
              </span>
              <span>
                Ngôn ngữ<strong>{selectedSet.language || "—"}</strong>
              </span>
              <span>
                Quyền riêng tư
                <strong>
                  {getLabel(studySetVisibilityLabels, selectedSet.visibility)}
                </strong>
              </span>
              <span>
                Trạng thái
                <strong>
                  {getLabel(studySetStatusLabels, selectedSet.status)}
                </strong>
              </span>
              <span>
                Số lượng thẻ<strong>{selectedSet.card_count}</strong>
              </span>
              <span>
                Ngày tạo<strong>{formatDate(selectedSet.created_at)}</strong>
              </span>
              <span>
                Ngày cập nhật
                <strong>{formatDate(selectedSet.updated_at)}</strong>
              </span>
            </div>
            <p className="modal-description">
              {selectedSet.description || "Chưa có mô tả."}
            </p>
            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={() => navigate(`/cards?setId=${selectedSet.set_id}`)}
              >
                Xem thẻ
              </button>
              <button
                className="ghost-button"
                onClick={() => setSelectedSet(null)}
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
