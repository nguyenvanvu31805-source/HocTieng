import {useEffect, useState, useCallback} from "react";
import {Link, useParams, useNavigate} from "react-router-dom";
import api from "../services/api";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

const MODE_MAP = {
  FLASHCARDS: {
    label: "Thẻ lật",
    icon: "🎴",
    path: "flashcards",
    color: "#6366f1",
  },
  LEARN: {
    label: "Luyện tập",
    icon: "🧠",
    path: "learn",
    color: "#10b981",
  },
  TEST: {
    label: "Kiểm tra",
    icon: "📝",
    path: "test",
    color: "#f59e0b",
  },
  MATCH: {
    label: "Ghép thẻ",
    icon: "🧩",
    path: "match",
    color: "#ec4899",
  },
};

export default function ClassDetailPage() {
  const {classId} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();

  const [classData, setClassData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState("assignments"); // 'assignments' | 'members'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Copy code state
  const [copiedCode, setCopiedCode] = useState(false);

  // Edit Class Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({name: "", description: ""});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Create Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableSets, setAvailableSets] = useState([]);
  const [assignForm, setAssignForm] = useState({
    set_id: "",
    title: "",
    description: "",
    mode: "LEARN",
    deadline: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  const isTeacher =
    classData?.is_teacher || user?.role === "TEACHER" || user?.role === "ADMIN";

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [classRes, assignRes, membersRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/classes/${classId}/assignments`).catch(() => ({data: {data: []}})),
        api.get(`/classes/${classId}/members`).catch(() => ({data: {data: []}})),
      ]);

      setClassData(classRes.data?.data);
      setAssignments(assignRes.data?.data || []);
      setMembers(membersRes.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải thông tin lớp học.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch Teacher's Study Sets when opening Create Assignment modal
  const handleOpenAssignModal = async () => {
    setAssignForm({
      set_id: "",
      title: "",
      description: "",
      mode: "LEARN",
      deadline: "",
    });
    setAssignError("");
    setShowAssignModal(true);

    try {
      // Try to get teacher's sets
      const {data} = await api.get("/study-sets/my");
      const mySets = data?.data || [];
      if (mySets.length > 0) {
        setAvailableSets(mySets);
        setAssignForm((prev) => ({...prev, set_id: String(mySets[0].set_id)}));
      } else {
        // Fallback to explore/public sets
        const exploreRes = await api.get("/study-sets?limit=20");
        const publicSets = exploreRes.data?.data || [];
        setAvailableSets(publicSets);
        if (publicSets.length > 0) {
          setAssignForm((prev) => ({
            ...prev,
            set_id: String(publicSets[0].set_id),
          }));
        }
      }
    } catch {
      setAvailableSets([]);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.set_id) {
      setAssignError("Vui lòng chọn bộ học.");
      return;
    }
    if (!assignForm.title.trim()) {
      setAssignError("Vui lòng nhập tiêu đề bài tập.");
      return;
    }

    setAssignLoading(true);
    setAssignError("");
    try {
      await api.post(`/classes/${classId}/assignments`, {
        set_id: Number(assignForm.set_id),
        title: assignForm.title.trim(),
        description: assignForm.description.trim() || null,
        mode: assignForm.mode,
        deadline: assignForm.deadline || null,
      });
      setShowAssignModal(false);
      fetchAllData();
    } catch (err) {
      setAssignError(getErrorMessage(err) || "Không thể giao bài tập.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;

    try {
      await api.delete(`/assignments/${assignmentId}`);
      fetchAllData();
    } catch (err) {
      alert(getErrorMessage(err) || "Không thể xóa bài tập.");
    }
  };

  const handleEditClassSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError("Vui lòng nhập tên lớp học.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      await api.patch(`/classes/${classId}`, editForm);
      setShowEditModal(false);
      fetchAllData();
    } catch (err) {
      setEditError(getErrorMessage(err) || "Không thể cập nhật lớp.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleLeaveClass = async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn rời lớp học này? Bạn sẽ cần nhập lại mã tham gia nếu muốn vào lại.",
      )
    )
      return;

    try {
      await api.delete(`/classes/${classId}/members/me`);
      navigate("/classes");
    } catch (err) {
      alert(getErrorMessage(err) || "Không thể rời lớp học.");
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatDeadline = (deadlineStr) => {
    if (!deadlineStr) return null;
    const d = new Date(deadlineStr);
    const isPast = d < new Date();
    const formatted = d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {formatted, isPast};
  };

  if (loading) {
    return (
      <div className="class-detail-page">
        <Link className="back-link" to="/classes">
          ← Quay lại danh sách lớp
        </Link>
        <div className="empty-panel">Đang tải thông tin lớp học...</div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="class-detail-page">
        <Link className="back-link" to="/classes">
          ← Quay lại danh sách lớp
        </Link>
        <div className="form-error">Lỗi: {error || "Không tìm thấy lớp học."}</div>
      </div>
    );
  }

  return (
    <div className="class-detail-page">
      <Link className="back-link" to="/classes">
        ← Quay lại danh sách lớp
      </Link>

      {/* Class Heading Hero */}
      <div className="class-detail-header">
        <div className="class-detail-header-main">
          <div className="class-detail-title-row">
            <span className="eyebrow">LỚP HỌC / #{classData.class_id}</span>
            {isTeacher && classData.join_code && (
              <button
                className="join-code-badge"
                title="Bấm để sao chép mã"
                onClick={() => copyToClipboard(classData.join_code)}
              >
                Mã tham gia: <b>{classData.join_code}</b>
                <span className="copy-icon">
                  {copiedCode ? "✓ Đã chép" : "📋"}
                </span>
              </button>
            )}
          </div>

          <h1>{classData.name}</h1>
          <p className="muted">{classData.description || "Chưa có mô tả."}</p>

          <div className="class-detail-meta">
            <span>
              Giáo viên:{" "}
              <b>
                {classData.teacher_full_name ||
                  classData.teacher_username ||
                  "Giáo viên"}
              </b>
            </span>
            <span>
              <b>{members.length}</b> thành viên
            </span>
            <span>
              <b>{assignments.length}</b> bài tập
            </span>
          </div>
        </div>

        <div className="class-detail-header-actions">
          {isTeacher ? (
            <>
              <button
                className="button-primary"
                onClick={handleOpenAssignModal}
              >
                + Giao bài tập
              </button>
              <button
                className="button-outline"
                onClick={() => {
                  setEditForm({
                    name: classData.name,
                    description: classData.description || "",
                  });
                  setEditError("");
                  setShowEditModal(true);
                }}
              >
                Sửa lớp
              </button>
            </>
          ) : (
            <button className="button-outline button-danger" onClick={handleLeaveClass}>
              Rời lớp
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="class-tabs">
        <button
          className={`class-tab-btn ${activeTab === "assignments" ? "active" : ""}`}
          onClick={() => setActiveTab("assignments")}
        >
          📝 Bài tập ({assignments.length})
        </button>
        <button
          className={`class-tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          👥 Thành viên ({members.length})
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="assignments-tab-content">
          {assignments.length === 0 ? (
            <div className="empty-panel">
              <h3>Lớp chưa có bài tập nào.</h3>
              <p className="muted" style={{marginTop: "8px"}}>
                {isTeacher
                  ? "Bấm '+ Giao bài tập' để tạo bài luyện tập hoặc kiểm tra cho học sinh."
                  : "Giáo viên sẽ giao bài tập sớm. Hãy quay lại sau!"}
              </p>
              {isTeacher && (
                <button
                  className="button-primary"
                  style={{marginTop: "16px"}}
                  onClick={handleOpenAssignModal}
                >
                  + Giao bài ngay
                </button>
              )}
            </div>
          ) : (
            <div className="assignment-grid">
              {assignments.map((a) => {
                const modeInfo = MODE_MAP[a.mode] || MODE_MAP.LEARN;
                const deadlineInfo = formatDeadline(a.deadline);

                return (
                  <div className="assignment-card" key={a.assignment_id}>
                    <div className="assignment-card-header">
                      <span
                        className="assignment-mode-badge"
                        style={{
                          borderColor: modeInfo.color,
                          color: modeInfo.color,
                        }}
                      >
                        {modeInfo.icon} {modeInfo.label}
                      </span>

                      {deadlineInfo ? (
                        deadlineInfo.isPast ? (
                          <span className="deadline-badge expired">
                            ⚠️ Đã hết hạn
                          </span>
                        ) : (
                          <span className="deadline-badge active">
                            ⏰ Hạn: {deadlineInfo.formatted}
                          </span>
                        )
                      ) : (
                        <span className="deadline-badge none">
                          Không giới hạn
                        </span>
                      )}
                    </div>

                    <h3 className="assignment-title">{a.title}</h3>
                    {a.description && (
                      <p className="assignment-desc">{a.description}</p>
                    )}

                    <div className="assignment-set-info">
                      <span className="set-icon">📚</span>
                      <div>
                        <b>{a.study_set_title}</b>
                        <span className="card-count-text">
                          ({a.card_count} thẻ từ)
                        </span>
                      </div>
                    </div>

                    <div className="assignment-card-footer">
                      <Link
                        className="button-small button-primary"
                        to={`/study-sets/${a.set_id}/${modeInfo.path}`}
                      >
                        Học ngay →
                      </Link>

                      {isTeacher && (
                        <button
                          className="button-small button-outline button-delete"
                          onClick={() =>
                            handleDeleteAssignment(a.assignment_id)
                          }
                          title="Xóa bài tập này"
                        >
                          🗑 Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS */}
      {activeTab === "members" && (
        <div className="members-tab-content">
          <div className="member-list-container">
            {members.length === 0 ? (
              <div className="empty-panel">Chưa có thành viên.</div>
            ) : (
              <div className="member-list">
                {members.map((m) => {
                  const isRoleTeacher = m.member_role === "TEACHER";
                  const initial = (m.full_name || m.username || "U")
                    .slice(0, 1)
                    .toUpperCase();

                  return (
                    <div className="member-row" key={m.user_id}>
                      <div className="member-info-group">
                        <div
                          className={`member-avatar ${
                            isRoleTeacher ? "teacher-avatar" : ""
                          }`}
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.username} />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div>
                          <div className="member-name-row">
                            <span className="member-name">
                              {m.full_name || m.username}
                            </span>
                            <span
                              className={`member-role-badge ${
                                isRoleTeacher ? "role-teacher" : "role-student"
                              }`}
                            >
                              {isRoleTeacher ? "Giáo viên" : "Học sinh"}
                            </span>
                          </div>
                          <span className="member-username">@{m.username}</span>
                        </div>
                      </div>

                      <div className="member-joined-date">
                        Tham gia:{" "}
                        {new Date(m.joined_at).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE ASSIGNMENT (TEACHER) */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Giao bài tập cho lớp</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowAssignModal(false)}
              >
                ✕
              </button>
            </div>

            {assignError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {assignError}
              </div>
            )}

            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label>Chọn bộ học (Study Set) *</label>
                {availableSets.length === 0 ? (
                  <p className="muted" style={{fontSize: "0.9rem"}}>
                    Bạn chưa có bộ học nào. Hãy tạo bộ học trong Thư viện trước khi giao bài.
                  </p>
                ) : (
                  <select
                    value={assignForm.set_id}
                    onChange={(e) =>
                      setAssignForm({...assignForm, set_id: e.target.value})
                    }
                  >
                    {availableSets.map((s) => (
                      <option key={s.set_id} value={s.set_id}>
                        {s.title} ({s.card_count || 0} thẻ)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Tiêu đề bài tập *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ôn tập từ vựng Unit 1"
                  value={assignForm.title}
                  onChange={(e) =>
                    setAssignForm({...assignForm, title: e.target.value})
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả / Hướng dẫn bài tập</label>
                <textarea
                  rows="2"
                  placeholder="Nhập hướng dẫn cho học sinh (tùy chọn)..."
                  value={assignForm.description}
                  onChange={(e) =>
                    setAssignForm({...assignForm, description: e.target.value})
                  }
                />
              </div>

              <div className="form-group">
                <label>Chế độ học (Mode) *</label>
                <div className="mode-selection-grid">
                  {Object.entries(MODE_MAP).map(([modeKey, info]) => (
                    <button
                      key={modeKey}
                      type="button"
                      className={`mode-select-chip ${
                        assignForm.mode === modeKey ? "selected" : ""
                      }`}
                      onClick={() =>
                        setAssignForm({...assignForm, mode: modeKey})
                      }
                    >
                      <span className="mode-select-icon">{info.icon}</span>
                      <span className="mode-select-label">{info.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Hạn hoàn thành (Deadline)</label>
                <input
                  type="datetime-local"
                  value={assignForm.deadline}
                  onChange={(e) =>
                    setAssignForm({...assignForm, deadline: e.target.value})
                  }
                />
                <small className="muted" style={{marginTop: "4px", display: "block"}}>
                  Để trống nếu không giới hạn thời gian nộp bài.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline"
                  onClick={() => setShowAssignModal(false)}
                  disabled={assignLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={assignLoading || availableSets.length === 0}
                >
                  {assignLoading ? "Đang giao bài..." : "Giao bài ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLASS (TEACHER) */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sửa thông tin lớp học</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditClassSubmit}>
              <div className="form-group">
                <label>Tên lớp học *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({...editForm, name: e.target.value})
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả lớp học</label>
                <textarea
                  rows="3"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({...editForm, description: e.target.value})
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
