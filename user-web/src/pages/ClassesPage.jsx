import {useEffect, useState, useCallback} from "react";
import {Link} from "react-router-dom";
import api from "../services/api";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

export default function ClassesPage() {
  const {user} = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Class Modal State (Teacher)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({name: "", description: ""});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdClass, setCreatedClass] = useState(null);

  // Join Class Modal State (Student)
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinNotice, setJoinNotice] = useState({type: "", text: ""});

  // Copy join code tooltip state
  const [copiedCode, setCopiedCode] = useState("");

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const {data} = await api.get("/classes");
      setClasses(data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải danh sách lớp học.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError("Vui lòng nhập tên lớp học.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    try {
      const {data} = await api.post("/classes", createForm);
      setCreatedClass(data?.data);
      fetchClasses();
    } catch (err) {
      setCreateError(getErrorMessage(err) || "Không thể tạo lớp học.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinNotice({type: "error", text: "Vui lòng nhập mã tham gia."});
      return;
    }

    setJoinLoading(true);
    setJoinNotice({type: "", text: ""});
    try {
      const {data} = await api.post("/classes/join", {
        join_code: joinCode.trim(),
      });
      setJoinNotice({
        type: "success",
        text: data?.data?.message || data?.message || "Tham gia lớp thành công!",
      });
      fetchClasses();
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinCode("");
        setJoinNotice({type: "", text: ""});
      }, 1500);
    } catch (err) {
      setJoinNotice({
        type: "error",
        text: getErrorMessage(err) || "Mã tham gia không tồn tại hoặc lỗi.",
      });
    } finally {
      setJoinLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  return (
    <div className="classes-page">
      <div className="classes-header">
        <div>
          <p className="eyebrow">HỌC TẬP CÙNG NHAU</p>
          <h1>Lớp học của tôi</h1>
          <p className="muted">
            {isTeacher
              ? "Tạo và quản lý các lớp học, giao bài tập từ vựng cho học sinh."
              : "Theo dõi các lớp học bạn đã tham gia và hoàn thành bài tập được giao."}
          </p>
        </div>
        <div className="classes-header-actions">
          {isTeacher ? (
            <button
              className="button-primary"
              onClick={() => {
                setCreatedClass(null);
                setCreateForm({name: "", description: ""});
                setCreateError("");
                setShowCreateModal(true);
              }}
            >
              + Tạo lớp học
            </button>
          ) : (
            <button
              className="button-primary"
              onClick={() => {
                setJoinCode("");
                setJoinNotice({type: "", text: ""});
                setShowJoinModal(true);
              }}
            >
              + Tham gia lớp
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty-panel">Đang tải danh sách lớp học...</div>
      ) : error ? (
        <div className="form-error">
          <p>Lỗi: {error}</p>
          <button
            className="button-small button-outline"
            style={{marginTop: "12px"}}
            onClick={fetchClasses}
          >
            Thử lại
          </button>
        </div>
      ) : classes.length === 0 ? (
        <div className="empty-panel">
          {isTeacher ? (
            <>
              <h3>Bạn chưa tạo lớp nào.</h3>
              <p className="muted" style={{marginTop: "8px"}}>
                Hãy tạo lớp học để bắt đầu chia sẻ bộ từ vựng và giao bài tập cho học sinh.
              </p>
              <button
                className="button-primary"
                style={{marginTop: "20px"}}
                onClick={() => {
                  setCreatedClass(null);
                  setCreateForm({name: "", description: ""});
                  setCreateError("");
                  setShowCreateModal(true);
                }}
              >
                + Tạo lớp ngay
              </button>
            </>
          ) : (
            <>
              <h3>Bạn chưa tham gia lớp nào.</h3>
              <p className="muted" style={{marginTop: "8px"}}>
                Hãy nhập mã tham gia từ giáo viên để kết nối vào lớp học.
              </p>
              <button
                className="button-primary"
                style={{marginTop: "20px"}}
                onClick={() => {
                  setJoinCode("");
                  setJoinNotice({type: "", text: ""});
                  setShowJoinModal(true);
                }}
              >
                + Tham gia lớp
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="class-grid">
          {classes.map((c) => (
            <div className="class-card" key={c.class_id}>
              <div className="class-card-body">
                <div className="class-card-top">
                  <h3 className="class-card-title">{c.name}</h3>
                  {isTeacher && c.join_code && (
                    <button
                      className="join-code-badge"
                      title="Bấm để sao chép mã"
                      onClick={() => copyToClipboard(c.join_code)}
                    >
                      Mã: <b>{c.join_code}</b>
                      <span className="copy-icon">
                        {copiedCode === c.join_code ? "✓ Đã chép" : "📋"}
                      </span>
                    </button>
                  )}
                </div>

                <p className="class-card-desc">
                  {c.description || "Chưa có mô tả cho lớp học này."}
                </p>

                <div className="class-card-meta">
                  {!isTeacher && (
                    <span className="meta-item">
                      👨‍🏫{" "}
                      <b>
                        {c.teacher_full_name ||
                          c.teacher_username ||
                          "Giáo viên"}
                      </b>
                    </span>
                  )}
                  <span className="meta-item">
                    👥 <b>{c.member_count}</b> thành viên
                  </span>
                  <span className="meta-item">
                    📝 <b>{c.assignment_count}</b> bài tập
                  </span>
                </div>
              </div>

              <div className="class-card-footer">
                <Link
                  className="button-small button-primary"
                  to={`/classes/${c.class_id}`}
                >
                  Xem lớp →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CLASS MODAL (TEACHER) */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {createdClass ? (
              <div className="modal-success-state">
                <div className="success-icon">🎉</div>
                <h2>Tạo lớp học thành công!</h2>
                <p className="muted">
                  Chia sẻ mã tham gia dưới đây để học sinh có thể vào lớp:
                </p>
                <div className="join-code-display">
                  <span className="code-text">{createdClass.join_code}</span>
                  <button
                    className="button-small button-outline"
                    onClick={() => copyToClipboard(createdClass.join_code)}
                  >
                    {copiedCode === createdClass.join_code
                      ? "✓ Đã sao chép"
                      : "Sao chép mã"}
                  </button>
                </div>
                <div className="modal-actions" style={{marginTop: "24px"}}>
                  <button
                    className="button-primary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedClass(null);
                    }}
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Tạo lớp học mới</h2>
                  <button
                    className="modal-close-btn"
                    onClick={() => setShowCreateModal(false)}
                  >
                    ✕
                  </button>
                </div>
                {createError && (
                  <div className="form-error" style={{marginBottom: "16px"}}>
                    {createError}
                  </div>
                )}
                <form onSubmit={handleCreateSubmit}>
                  <div className="form-group">
                    <label>Tên lớp học *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: English Vocabulary 101"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({...createForm, name: e.target.value})
                      }
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Mô tả lớp học</label>
                    <textarea
                      rows="3"
                      placeholder="Nhập mô tả hoặc mục tiêu của lớp..."
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button-outline"
                      onClick={() => setShowCreateModal(false)}
                      disabled={createLoading}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="button-primary"
                      disabled={createLoading}
                    >
                      {createLoading ? "Đang tạo..." : "Tạo lớp"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* JOIN CLASS MODAL (STUDENT) */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Tham gia lớp học</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowJoinModal(false)}
              >
                ✕
              </button>
            </div>

            {joinNotice.text && (
              <div
                className={
                  joinNotice.type === "success"
                    ? "bookmark-notice"
                    : "form-error"
                }
                style={{marginBottom: "16px"}}
              >
                {joinNotice.text}
              </div>
            )}

            <form onSubmit={handleJoinSubmit}>
              <div className="form-group">
                <label>Nhập mã tham gia (Join Code) *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: ENG123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    fontWeight: "700",
                    textAlign: "center",
                    fontSize: "1.2rem",
                  }}
                  autoFocus
                />
                <small className="muted" style={{marginTop: "6px", display: "block"}}>
                  Mã tham gia gồm 6 ký tự do giáo viên cung cấp.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline"
                  onClick={() => setShowJoinModal(false)}
                  disabled={joinLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={joinLoading}
                >
                  {joinLoading ? "Đang tham gia..." : "Tham gia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
