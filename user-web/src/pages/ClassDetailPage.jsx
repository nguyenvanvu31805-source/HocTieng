import {useEffect, useState, useCallback} from "react";
import {Link, useParams, useNavigate} from "react-router-dom";
import api from "../services/api";
import assignmentService from "../services/assignmentService";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

const MODE_MAP = {
  ALL: {
    label: "Tất cả",
    icon: "🌟",
    path: "",
    color: "#7c3aed",
    description: "Học viên được tự do chọn bất kỳ chế độ học nào",
  },
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

const formatDateTime = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ClassDetailPage() {
  const {classId} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();

  const [classData, setClassData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [startingAssignId, setStartingAssignId] = useState(null);
  const [detailModalAssignment, setDetailModalAssignment] = useState(null);
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
  const [mySets, setMySets] = useState([]);
  const [publicSets, setPublicSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [setsError, setSetsError] = useState("");
  const [assignForm, setAssignForm] = useState({
    set_id: "",
    title: "",
    description: "",
    mode: "LEARN",
    deadline: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Edit Assignment Modal State (Teacher)
  const [editAssignModal, setEditAssignModal] = useState(null);
  const [editAssignForm, setEditAssignForm] = useState({
    title: "",
    description: "",
    mode: "LEARN",
    deadline: "",
  });
  const [editAssignLoading, setEditAssignLoading] = useState(false);
  const [editAssignError, setEditAssignError] = useState("");

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

      const classInfo = classRes.data?.data;
      const assignList = assignRes.data?.data || [];
      setClassData(classInfo);
      setAssignments(assignList);
      setMembers(membersRes.data?.data || []);

      const isTeacherUser =
        classInfo?.teacher_id === user?.user_id ||
        user?.role === "TEACHER" ||
        user?.role === "ADMIN";

      if (!isTeacherUser && assignList.length > 0) {
        setSubmissionsLoading(true);
        try {
          const subResults = await Promise.all(
            assignList.map((a) =>
              assignmentService.getMySubmission(a.assignment_id).catch(() => null)
            )
          );
          const subMap = {};
          assignList.forEach((a, idx) => {
            if (subResults[idx]) {
              subMap[a.assignment_id] = subResults[idx];
            }
          });
          setSubmissions(subMap);
        } catch {
          // ignore
        } finally {
          setSubmissionsLoading(false);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải thông tin lớp học.");
    } finally {
      setLoading(false);
    }
  }, [classId, user?.user_id, user?.role]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch Teacher's Study Sets & Public Study Sets when opening Create Assignment modal
  const handleOpenAssignModal = async () => {
    setAssignForm({
      set_id: "",
      title: "",
      description: "",
      mode: "LEARN",
      deadline: "",
    });
    setAssignError("");
    setSetsError("");
    setShowAssignModal(true);
    setSetsLoading(true);

    try {
      const [myRes, pubRes] = await Promise.all([
        api.get("/study-sets/my").catch(() => ({data: {data: []}})),
        api.get("/study-sets?limit=100").catch(() => ({data: {data: []}})),
      ]);

      const my = myRes.data?.data || [];
      const pubRaw = pubRes.data?.data || [];
      // Deduplicate: exclude sets already in my
      const pub = pubRaw.filter(
        (ps) => !my.some((ms) => Number(ms.set_id) === Number(ps.set_id))
      );

      setMySets(my);
      setPublicSets(pub);

      if (my.length > 0) {
        setAssignForm((prev) => ({...prev, set_id: String(my[0].set_id)}));
      } else if (pub.length > 0) {
        setAssignForm((prev) => ({...prev, set_id: String(pub[0].set_id)}));
      }
    } catch (err) {
      setSetsError(getErrorMessage(err) || "Không thể tải danh sách bộ học.");
    } finally {
      setSetsLoading(false);
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
      const msg = getErrorMessage(err);
      if (assignForm.mode === "ALL" && msg.includes("Data truncated")) {
        setAssignError(
          "Chế độ 'Tất cả' yêu cầu cập nhật cơ sở dữ liệu (Database migration: ALTER TABLE assignments MODIFY COLUMN mode ENUM('FLASHCARDS','LEARN','TEST','MATCH','ALL')). Vui lòng chạy lệnh SQL trên database."
        );
      } else {
        setAssignError(msg || "Không thể giao bài tập.");
      }
    } finally {
      setAssignLoading(false);
    }
  };

  const handleOpenEditAssign = (assignment) => {
    let localDeadline = "";
    if (assignment.deadline) {
      const d = new Date(assignment.deadline);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        localDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }
    setEditAssignForm({
      title: assignment.title || "",
      description: assignment.description || "",
      mode: assignment.mode || "LEARN",
      deadline: localDeadline,
    });
    setEditAssignError("");
    setEditAssignModal(assignment);
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    if (!editAssignForm.title.trim()) {
      setEditAssignError("Vui lòng nhập tiêu đề bài tập.");
      return;
    }

    setEditAssignLoading(true);
    setEditAssignError("");
    try {
      await api.patch(`/assignments/${editAssignModal.assignment_id}`, {
        title: editAssignForm.title.trim(),
        description: editAssignForm.description.trim() || null,
        mode: editAssignForm.mode,
        deadline: editAssignForm.deadline || null,
      });
      setEditAssignModal(null);
      fetchAllData();
    } catch (err) {
      const msg = getErrorMessage(err);
      if (editAssignForm.mode === "ALL" && msg.includes("Data truncated")) {
        setEditAssignError(
          "Chế độ 'Tất cả' yêu cầu cập nhật cơ sở dữ liệu (Database migration). Vui lòng chạy lệnh: ALTER TABLE assignments MODIFY COLUMN mode ENUM('FLASHCARDS','LEARN','TEST','MATCH','ALL') NOT NULL DEFAULT 'TEST';"
        );
      } else {
        setEditAssignError(msg || "Không thể cập nhật bài tập.");
      }
    } finally {
      setEditAssignLoading(false);
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

  const handleStartAssignment = async (a) => {
    if (a.mode === "ALL") {
      setDetailModalAssignment(a);
      return;
    }
    setStartingAssignId(a.assignment_id);
    try {
      const res = await assignmentService.startAssignment(a.assignment_id);
      setSubmissions((prev) => ({
        ...prev,
        [a.assignment_id]: res,
      }));
      const modeInfo = MODE_MAP[a.mode] || MODE_MAP.LEARN;
      navigate(
        `/study-sets/${a.set_id}/${modeInfo.path}?assignmentId=${a.assignment_id}&classId=${classId}`
      );
    } catch (err) {
      alert(getErrorMessage(err) || "Không thể bắt đầu bài tập.");
    } finally {
      setStartingAssignId(null);
    }
  };

  const handleStartAssignmentWithMode = async (a, chosenModeKey) => {
    setStartingAssignId(a.assignment_id);
    try {
      const res = await assignmentService.startAssignment(a.assignment_id);
      setSubmissions((prev) => ({
        ...prev,
        [a.assignment_id]: res,
      }));
      const chosenMode = MODE_MAP[chosenModeKey] || MODE_MAP.LEARN;
      navigate(
        `/study-sets/${a.set_id}/${chosenMode.path}?assignmentId=${a.assignment_id}&classId=${classId}`
      );
    } catch (err) {
      alert(getErrorMessage(err) || "Không thể bắt đầu bài tập.");
    } finally {
      setStartingAssignId(null);
    }
  };

  const handleContinueAssignment = (a) => {
    if (a.mode === "ALL") {
      setDetailModalAssignment(a);
      return;
    }
    const modeInfo = MODE_MAP[a.mode] || MODE_MAP.LEARN;
    navigate(
      `/study-sets/${a.set_id}/${modeInfo.path}?assignmentId=${a.assignment_id}&classId=${classId}`
    );
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

                    <h3
                      className="assignment-title"
                      style={{cursor: "pointer"}}
                      onClick={() => setDetailModalAssignment(a)}
                      title="Xem chi tiết bài tập"
                    >
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="assignment-desc">{a.description}</p>
                    )}

                    {/* Student Status Badge */}
                    {!isTeacher && (
                      <div className="assignment-student-status">
                        {submissionsLoading ? (
                          <span className="submission-badge loading">
                            Đang tải trạng thái...
                          </span>
                        ) : submissions[a.assignment_id]?.status === "COMPLETED" ? (
                          <span className="submission-badge completed">
                            🟢 Đã hoàn thành{a.mode === "TEST" && submissions[a.assignment_id]?.score !== null ? ` · ${submissions[a.assignment_id]?.score}%` : ""}
                          </span>
                        ) : submissions[a.assignment_id]?.status === "IN_PROGRESS" ? (
                          <span className="submission-badge in-progress">
                            🟡 Đang làm
                          </span>
                        ) : submissions[a.assignment_id]?.status === "OVERDUE" ? (
                          <span className="submission-badge overdue">
                            🔴 Quá hạn
                          </span>
                        ) : (
                          <span className="submission-badge not-started">
                            ⚪ Chưa làm
                          </span>
                        )}
                      </div>
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
                      {!isTeacher ? (
                        <>
                          <button
                            className="button-small button-outline"
                            onClick={() => setDetailModalAssignment(a)}
                          >
                            Chi tiết
                          </button>

                          {submissions[a.assignment_id]?.status === "COMPLETED" ? (
                            a.mode === "TEST" && submissions[a.assignment_id]?.result_id ? (
                              <Link
                                className="button-small button-primary"
                                to={`/study-sets/${a.set_id}/test-review/${submissions[a.assignment_id]?.result_id}`}
                              >
                                Xem kết quả
                              </Link>
                            ) : (
                              <span className="assignment-completed-label">
                                ✓ Đã hoàn thành
                              </span>
                            )
                          ) : submissions[a.assignment_id]?.status === "IN_PROGRESS" ? (
                            <button
                              className="button-small button-primary"
                              onClick={() => handleContinueAssignment(a)}
                            >
                              Tiếp tục làm bài
                            </button>
                          ) : submissions[a.assignment_id]?.status === "OVERDUE" ? (
                            <button className="button-small button-disabled" disabled>
                              Đã hết hạn
                            </button>
                          ) : (
                            <button
                              className="button-small button-primary"
                              disabled={startingAssignId === a.assignment_id}
                              onClick={() => handleStartAssignment(a)}
                            >
                              {startingAssignId === a.assignment_id
                                ? "Đang bắt đầu..."
                                : a.mode === "ALL"
                                ? "🌟 Làm bài tập"
                                : "Bắt đầu làm bài"}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <Link
                            className="button-small button-primary"
                            to={`/classes/${classId}/assignments/${a.assignment_id}/gradebook`}
                            title="Xem bảng điểm bài tập này"
                          >
                            📊 Bảng điểm
                          </Link>
                          <button
                            className="button-small button-outline"
                            onClick={() => setDetailModalAssignment(a)}
                          >
                            Chi tiết
                          </button>
                          <button
                            className="button-small button-outline button-edit"
                            onClick={() => handleOpenEditAssign(a)}
                            title="Sửa bài tập này"
                          >
                            ✏️ Sửa
                          </button>
                          <Link
                            className="button-small button-outline"
                            to={a.mode === "ALL" ? `/study-sets/${a.set_id}` : `/study-sets/${a.set_id}/${modeInfo.path}`}
                          >
                            Xem bộ học →
                          </Link>
                          <button
                            className="button-small button-outline button-delete"
                            onClick={() =>
                              handleDeleteAssignment(a.assignment_id)
                            }
                            title="Xóa bài tập này"
                          >
                            🗑 Xóa
                          </button>
                        </>
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

            <form onSubmit={handleCreateAssignment} className="modal-form">
              <div className="modal-form-group">
                <label htmlFor="assign-set-select">Chọn bộ học (Study Set) *</label>
                {setsLoading ? (
                  <div className="modal-form-loading">⏳ Đang tải danh sách bộ học...</div>
                ) : setsError ? (
                  <div className="form-error">{setsError}</div>
                ) : mySets.length === 0 && publicSets.length === 0 ? (
                  <div className="modal-form-empty">
                    <p>Bạn chưa có bộ học nào và chưa có bộ học công khai.</p>
                    <Link to="/study-sets/create" className="button-small button-outline">
                      + Tạo bộ học mới
                    </Link>
                  </div>
                ) : (
                  <select
                    id="assign-set-select"
                    value={assignForm.set_id}
                    onChange={(e) =>
                      setAssignForm({...assignForm, set_id: e.target.value})
                    }
                    required
                  >
                    <option value="" disabled>-- Chọn một bộ học --</option>
                    {mySets.length > 0 && (
                      <optgroup label="📁 Bộ học của tôi">
                        {mySets.map((s) => (
                          <option key={`my-${s.set_id}`} value={s.set_id}>
                            {s.title} ({s.card_count || 0} thẻ)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {publicSets.length > 0 && (
                      <optgroup label="🌐 Bộ học công khai">
                        {publicSets.map((s) => (
                          <option key={`pub-${s.set_id}`} value={s.set_id}>
                            {s.title} ({s.card_count || 0} thẻ)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              <div className="modal-form-group">
                <label htmlFor="assign-title">Tiêu đề bài tập *</label>
                <input
                  id="assign-title"
                  type="text"
                  placeholder="Ví dụ: Ôn tập từ vựng Unit 1"
                  value={assignForm.title}
                  onChange={(e) =>
                    setAssignForm({...assignForm, title: e.target.value})
                  }
                  required
                />
              </div>

              <div className="modal-form-group">
                <label htmlFor="assign-description">Mô tả / Hướng dẫn bài tập</label>
                <textarea
                  id="assign-description"
                  rows="3"
                  placeholder="Nhập hướng dẫn cho học sinh (tùy chọn)..."
                  value={assignForm.description}
                  onChange={(e) =>
                    setAssignForm({...assignForm, description: e.target.value})
                  }
                />
              </div>

              <div className="modal-form-group">
                <label>Chế độ học (Mode) *</label>
                <div className="mode-selection-container">
                  <button
                    type="button"
                    className={`mode-select-chip-all ${assignForm.mode === "ALL" ? "selected" : ""}`}
                    onClick={() => setAssignForm({...assignForm, mode: "ALL"})}
                  >
                    <span className="mode-select-icon">🌟</span>
                    <div className="mode-select-info">
                      <span className="mode-select-title">Tất cả (ALL)</span>
                      <span className="mode-select-desc">Học viên được tự do chọn Thẻ lật, Luyện tập, Kiểm tra hoặc Ghép thẻ</span>
                    </div>
                    {assignForm.mode === "ALL" && <span className="mode-check">✓</span>}
                  </button>

                  <div className="mode-subgrid">
                    {["FLASHCARDS", "LEARN", "TEST", "MATCH"].map((modeKey) => {
                      const info = MODE_MAP[modeKey];
                      return (
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
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-form-group">
                <label htmlFor="assign-deadline">Hạn hoàn thành (Deadline)</label>
                <input
                  id="assign-deadline"
                  type="datetime-local"
                  value={assignForm.deadline}
                  onChange={(e) =>
                    setAssignForm({...assignForm, deadline: e.target.value})
                  }
                />
                <small className="modal-form-help">
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
                  disabled={assignLoading || (mySets.length === 0 && publicSets.length === 0)}
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

            <form onSubmit={handleEditClassSubmit} className="modal-form">
              <div className="modal-form-group">
                <label htmlFor="edit-class-name">Tên lớp học *</label>
                <input
                  id="edit-class-name"
                  type="text"
                  placeholder="Nhập tên lớp học..."
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({...editForm, name: e.target.value})
                  }
                  required
                />
              </div>

              <div className="modal-form-group">
                <label htmlFor="edit-class-desc">Mô tả lớp học</label>
                <textarea
                  id="edit-class-desc"
                  rows="3"
                  placeholder="Nhập mô tả lớp học (tùy chọn)..."
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

      {/* MODAL: EDIT ASSIGNMENT (TEACHER) */}
      {editAssignModal && (
        <div
          className="modal-overlay"
          onClick={() => setEditAssignModal(null)}
        >
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Sửa bài tập</h2>
              <button
                className="modal-close-btn"
                onClick={() => setEditAssignModal(null)}
              >
                ✕
              </button>
            </div>

            {editAssignError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {editAssignError}
              </div>
            )}

            <form onSubmit={handleUpdateAssignment} className="modal-form">
              <div className="modal-form-group">
                <label>Bộ học (Study Set)</label>
                <input
                  type="text"
                  value={`${editAssignModal.study_set_title || "Bộ học"} (${editAssignModal.card_count || 0} thẻ)`}
                  disabled
                  style={{background: "var(--paper)", cursor: "not-allowed", opacity: 0.85}}
                />
              </div>

              <div className="modal-form-group">
                <label htmlFor="edit-assign-title">Tiêu đề bài tập *</label>
                <input
                  id="edit-assign-title"
                  type="text"
                  placeholder="Ví dụ: Ôn tập từ vựng Unit 1"
                  value={editAssignForm.title}
                  onChange={(e) =>
                    setEditAssignForm({...editAssignForm, title: e.target.value})
                  }
                  required
                />
              </div>

              <div className="modal-form-group">
                <label htmlFor="edit-assign-desc">Mô tả / Hướng dẫn bài tập</label>
                <textarea
                  id="edit-assign-desc"
                  rows="3"
                  placeholder="Nhập hướng dẫn cho học sinh (tùy chọn)..."
                  value={editAssignForm.description}
                  onChange={(e) =>
                    setEditAssignForm({...editAssignForm, description: e.target.value})
                  }
                />
              </div>

              <div className="modal-form-group">
                <label>Chế độ học (Mode) *</label>
                <div className="mode-selection-container">
                  <button
                    type="button"
                    className={`mode-select-chip-all ${editAssignForm.mode === "ALL" ? "selected" : ""}`}
                    onClick={() => setEditAssignForm({...editAssignForm, mode: "ALL"})}
                  >
                    <span className="mode-select-icon">🌟</span>
                    <div className="mode-select-info">
                      <span className="mode-select-title">Tất cả (ALL)</span>
                      <span className="mode-select-desc">Học viên được tự do chọn Thẻ lật, Luyện tập, Kiểm tra hoặc Ghép thẻ</span>
                    </div>
                    {editAssignForm.mode === "ALL" && <span className="mode-check">✓</span>}
                  </button>

                  <div className="mode-subgrid">
                    {["FLASHCARDS", "LEARN", "TEST", "MATCH"].map((modeKey) => {
                      const info = MODE_MAP[modeKey];
                      return (
                        <button
                          key={modeKey}
                          type="button"
                          className={`mode-select-chip ${
                            editAssignForm.mode === modeKey ? "selected" : ""
                          }`}
                          onClick={() =>
                            setEditAssignForm({...editAssignForm, mode: modeKey})
                          }
                        >
                          <span className="mode-select-icon">{info.icon}</span>
                          <span className="mode-select-label">{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-form-group">
                <label htmlFor="edit-assign-deadline">Hạn hoàn thành (Deadline)</label>
                <input
                  id="edit-assign-deadline"
                  type="datetime-local"
                  value={editAssignForm.deadline}
                  onChange={(e) =>
                    setEditAssignForm({...editAssignForm, deadline: e.target.value})
                  }
                />
                <small className="modal-form-help">
                  Để trống nếu không giới hạn thời gian nộp bài.
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-outline"
                  onClick={() => setEditAssignModal(null)}
                  disabled={editAssignLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={editAssignLoading}
                >
                  {editAssignLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGNMENT DETAIL */}
      {detailModalAssignment && (
        <div
          className="modal-overlay"
          onClick={() => setDetailModalAssignment(null)}
        >
          <div
            className="modal-content assignment-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Chi tiết bài tập</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDetailModalAssignment(null)}
              >
                ✕
              </button>
            </div>

            <div className="assignment-detail-modal-body">
              <div className="detail-row">
                <span className="detail-label">Tiêu đề:</span>
                <span className="detail-value font-bold">
                  {detailModalAssignment.title}
                </span>
              </div>

              {detailModalAssignment.description && (
                <div className="detail-row">
                  <span className="detail-label">Mô tả:</span>
                  <span className="detail-value">
                    {detailModalAssignment.description}
                  </span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Lớp học:</span>
                <span className="detail-value">{classData?.name}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Chế độ học:</span>
                <span className="detail-value">
                  {MODE_MAP[detailModalAssignment.mode]?.icon}{" "}
                  {MODE_MAP[detailModalAssignment.mode]?.label}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Bộ từ vựng:</span>
                <span className="detail-value font-semibold">
                  📚 {detailModalAssignment.study_set_title} (
                  {detailModalAssignment.card_count} thẻ từ)
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Hạn hoàn thành:</span>
                <span className="detail-value">
                  {formatDeadline(detailModalAssignment.deadline)?.formatted ||
                    "Không giới hạn"}
                </span>
              </div>

              {!isTeacher && (
                <>
                  <hr className="detail-divider" />
                  <div className="detail-row">
                    <span className="detail-label">Trạng thái:</span>
                    <span className="detail-value">
                      {submissions[detailModalAssignment.assignment_id]
                        ?.status === "COMPLETED" ? (
                        <span className="submission-badge completed">
                          🟢 Đã hoàn thành
                          {detailModalAssignment.mode === "TEST" &&
                          submissions[detailModalAssignment.assignment_id]
                            ?.score !== null
                            ? ` · ${
                                submissions[
                                  detailModalAssignment.assignment_id
                                ]?.score
                              }%`
                            : ""}
                        </span>
                      ) : submissions[detailModalAssignment.assignment_id]
                          ?.status === "IN_PROGRESS" ? (
                        <span className="submission-badge in-progress">
                          🟡 Đang làm
                        </span>
                      ) : submissions[detailModalAssignment.assignment_id]
                          ?.status === "OVERDUE" ? (
                        <span className="submission-badge overdue">
                          🔴 Quá hạn
                        </span>
                      ) : (
                        <span className="submission-badge not-started">
                          ⚪ Chưa làm
                        </span>
                      )}
                    </span>
                  </div>

                  {submissions[detailModalAssignment.assignment_id]?.score !==
                    null &&
                    submissions[detailModalAssignment.assignment_id]?.score !==
                      undefined && (
                      <div className="detail-row">
                        <span className="detail-label">Điểm số:</span>
                        <span className="detail-value font-bold text-green-700">
                          {
                            submissions[detailModalAssignment.assignment_id]
                              ?.score
                          }
                          %
                        </span>
                      </div>
                    )}

                  {submissions[detailModalAssignment.assignment_id]
                    ?.started_at && (
                    <div className="detail-row">
                      <span className="detail-label">Bắt đầu lúc:</span>
                      <span className="detail-value">
                        {formatDateTime(
                          submissions[detailModalAssignment.assignment_id]
                            ?.started_at,
                        )}
                      </span>
                    </div>
                  )}

                  {submissions[detailModalAssignment.assignment_id]
                    ?.submitted_at && (
                    <div className="detail-row">
                      <span className="detail-label">Nộp lúc:</span>
                      <span className="detail-value">
                        {formatDateTime(
                          submissions[detailModalAssignment.assignment_id]
                            ?.submitted_at,
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Student Mode Selector for ALL mode */}
              {detailModalAssignment.mode === "ALL" && !isTeacher && (
                <div className="student-mode-choice-section">
                  <div className="student-mode-choice-title">
                    🌟 Chọn chế độ bạn muốn học:
                  </div>
                  <div className="student-mode-choice-grid">
                    {["FLASHCARDS", "LEARN", "TEST", "MATCH"].map((mKey) => {
                      const mInfo = MODE_MAP[mKey];
                      return (
                        <button
                          key={mKey}
                          type="button"
                          className="student-mode-choice-btn"
                          disabled={startingAssignId === detailModalAssignment.assignment_id}
                          onClick={() => {
                            const a = detailModalAssignment;
                            setDetailModalAssignment(null);
                            handleStartAssignmentWithMode(a, mKey);
                          }}
                        >
                          <span>{mInfo.icon}</span>
                          <span>{mInfo.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{marginTop: "20px"}}>
              <button
                type="button"
                className="button-outline"
                onClick={() => setDetailModalAssignment(null)}
              >
                Đóng
              </button>

              {!isTeacher && (
                submissions[detailModalAssignment.assignment_id]?.status ===
                "COMPLETED" ? (
                  detailModalAssignment.mode === "TEST" &&
                  submissions[detailModalAssignment.assignment_id]?.result_id ? (
                    <Link
                      className="button-primary"
                      to={`/study-sets/${detailModalAssignment.set_id}/test-review/${submissions[detailModalAssignment.assignment_id]?.result_id}`}
                    >
                      Xem kết quả bài kiểm tra
                    </Link>
                  ) : null
                ) : submissions[detailModalAssignment.assignment_id]?.status ===
                  "IN_PROGRESS" ? (
                  detailModalAssignment.mode === "ALL" ? null : (
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => {
                        const a = detailModalAssignment;
                        setDetailModalAssignment(null);
                        handleContinueAssignment(a);
                      }}
                    >
                      Tiếp tục làm bài
                    </button>
                  )
                ) : submissions[detailModalAssignment.assignment_id]?.status ===
                  "OVERDUE" ? (
                  <button
                    type="button"
                    className="button-disabled"
                    disabled
                  >
                    Đã quá hạn
                  </button>
                ) : (
                  detailModalAssignment.mode === "ALL" ? null : (
                    <button
                      type="button"
                      className="button-primary"
                      disabled={
                        startingAssignId === detailModalAssignment.assignment_id
                      }
                      onClick={() => {
                        const a = detailModalAssignment;
                        setDetailModalAssignment(null);
                        handleStartAssignment(a);
                      }}
                    >
                      {startingAssignId === detailModalAssignment.assignment_id
                        ? "Đang bắt đầu..."
                        : "Bắt đầu làm bài"}
                    </button>
                  )
                )
              )}

              {isTeacher && (
                <>
                  <button
                    type="button"
                    className="button-outline button-edit"
                    onClick={() => {
                      const a = detailModalAssignment;
                      setDetailModalAssignment(null);
                      handleOpenEditAssign(a);
                    }}
                  >
                    ✏️ Sửa bài tập
                  </button>
                  <Link
                    className="button-primary"
                    to={`/classes/${classId}/assignments/${detailModalAssignment.assignment_id}/gradebook`}
                    onClick={() => setDetailModalAssignment(null)}
                  >
                    📊 Xem bảng điểm
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
