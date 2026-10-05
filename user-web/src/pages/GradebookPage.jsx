import {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import api from "../services/api";
import assignmentService from "../services/assignmentService";
import {getErrorMessage} from "../utils/errors";

const MODE_MAP = {
  LEARN: {label: "Luyện tập", icon: "🧠", color: "#2563eb"},
  FLASHCARDS: {label: "Flashcards", icon: "🗂", color: "#059669"},
  TEST: {label: "Kiểm tra", icon: "📝", color: "#d97706"},
  MATCH: {label: "Ghép thẻ", icon: "🧩", color: "#7c3aed"},
  ALL: {label: "Tất cả", icon: "🌟", color: "#8b5cf6"},
};

const STATUS_MAP = {
  NOT_STARTED: {label: "Chưa làm", className: "not-started", icon: "⚪"},
  IN_PROGRESS: {label: "Đang làm", className: "in-progress", icon: "🟡"},
  COMPLETED: {label: "Đã hoàn thành", className: "completed", icon: "🟢"},
  OVERDUE: {label: "Quá hạn", className: "overdue", icon: "🔴"},
};

const STATUS_PRIORITY = {
  OVERDUE: 1,
  IN_PROGRESS: 2,
  NOT_STARTED: 3,
  COMPLETED: 4,
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDeadline = (deadlineStr) => {
  if (!deadlineStr) return null;
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return null;
  const isPast = d < new Date();
  const formatted = d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {formatted, isPast};
};

export default function GradebookPage() {
  const {classId, assignmentId} = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [gradebook, setGradebook] = useState(null);
  const [classInfo, setClassInfo] = useState(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("priority"); // priority | name | score

  const fetchGradebookData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    setUnauthorized(false);
    setNotFound(false);

    try {
      const [gradebookRes, classRes] = await Promise.all([
        assignmentService.getGradebook(classId, assignmentId),
        api.get(`/classes/${classId}`).catch(() => null),
      ]);

      setGradebook(gradebookRes);
      if (classRes?.data?.data) {
        setClassInfo(classRes.data.data);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setUnauthorized(true);
        setError("Bạn không có quyền xem bảng điểm này.");
      } else if (status === 404) {
        setNotFound(true);
        setError(getErrorMessage(err) || "Không tìm thấy bài tập hoặc lớp học.");
      } else {
        setError(getErrorMessage(err) || "Không thể tải bảng điểm.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, assignmentId]);

  useEffect(() => {
    fetchGradebookData();
  }, [fetchGradebookData]);

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    if (!gradebook?.students) return [];

    let list = [...gradebook.students];

    // Status filter
    if (statusFilter !== "ALL") {
      list = list.filter((s) => s.status === statusFilter);
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const nameMatch = s.full_name?.toLowerCase().includes(q);
        const usernameMatch = s.username?.toLowerCase().includes(q);
        const emailMatch = s.email?.toLowerCase().includes(q);
        return Boolean(nameMatch || usernameMatch || emailMatch);
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "priority") {
        const pA = STATUS_PRIORITY[a.status] || 99;
        const pB = STATUS_PRIORITY[b.status] || 99;
        if (pA !== pB) return pA - pB;
        return (a.full_name || a.username || "").localeCompare(
          b.full_name || b.username || ""
        );
      }
      if (sortBy === "name") {
        return (a.full_name || a.username || "").localeCompare(
          b.full_name || b.username || ""
        );
      }
      if (sortBy === "score") {
        const scoreA = a.score !== null ? a.score : -1;
        const scoreB = b.score !== null ? b.score : -1;
        return scoreB - scoreA;
      }
      return 0;
    });

    return list;
  }, [gradebook?.students, statusFilter, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="gradebook-page">
        <Link className="back-link" to={`/classes/${classId}`}>
          ← Quay lại lớp học
        </Link>
        <div className="empty-panel">Đang tải bảng điểm...</div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="gradebook-page">
        <Link className="back-link" to={`/classes/${classId}`}>
          ← Quay lại lớp học
        </Link>
        <div className="empty-panel">
          <div className="gradebook-warning-icon">🔒</div>
          <h2>Không có quyền truy cập</h2>
          <p className="muted" style={{marginTop: "8px", marginBottom: "16px"}}>
            {error || "Bạn không có quyền xem bảng điểm này. Chỉ giáo viên sở hữu lớp mới có quyền truy cập."}
          </p>
          <button
            className="button-primary"
            onClick={() => navigate(`/classes/${classId}`)}
          >
            Quay lại lớp học
          </button>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="gradebook-page">
        <Link className="back-link" to={`/classes/${classId}`}>
          ← Quay lại lớp học
        </Link>
        <div className="empty-panel">
          <h2>Không tìm thấy bài tập</h2>
          <p className="muted" style={{marginTop: "8px", marginBottom: "16px"}}>
            {error || "Bài tập không tồn tại hoặc không thuộc lớp học này."}
          </p>
          <button
            className="button-primary"
            onClick={() => navigate(`/classes/${classId}`)}
          >
            Quay lại lớp học
          </button>
        </div>
      </div>
    );
  }

  if (error && !gradebook) {
    return (
      <div className="gradebook-page">
        <Link className="back-link" to={`/classes/${classId}`}>
          ← Quay lại lớp học
        </Link>
        <div className="form-error">Lỗi: {error}</div>
        <div style={{display: "flex", gap: "10px", marginTop: "16px"}}>
          <button className="button-primary" onClick={() => fetchGradebookData()}>
            Thử lại
          </button>
          <button
            className="button-outline"
            onClick={() => navigate(`/classes/${classId}`)}
          >
            Quay lại lớp học
          </button>
        </div>
      </div>
    );
  }

  const assignment = gradebook?.assignment || {};
  const summary = gradebook?.summary || {};
  const modeInfo = MODE_MAP[assignment.mode] || MODE_MAP.LEARN;
  const deadlineInfo = formatDeadline(assignment.deadline);

  return (
    <div className="gradebook-page">
      <div className="gradebook-top-bar">
        <Link className="back-link" to={`/classes/${classId}`}>
          ← Quay lại lớp học
        </Link>
        <button
          className="button-small button-outline refresh-btn"
          disabled={refreshing}
          onClick={() => fetchGradebookData(true)}
          title="Làm mới bảng điểm"
        >
          {refreshing ? "Đang tải..." : "🔄 Làm mới"}
        </button>
      </div>

      {/* Header Hero */}
      <div className="gradebook-header">
        <div className="gradebook-header-main">
          <div className="gradebook-eyebrow-row">
            <span className="eyebrow">
              LỚP HỌC: {classInfo?.name || `Lớp #${classId}`}
            </span>
            <span
              className="assignment-mode-badge"
              style={{
                borderColor: modeInfo.color,
                color: modeInfo.color,
              }}
            >
              {modeInfo.icon} {modeInfo.label}
            </span>
          </div>

          <h1 className="gradebook-title">{assignment.title}</h1>

          <div className="gradebook-meta-row">
            <span>
              📚 Bộ học:{" "}
              {assignment.set_id ? (
                <Link
                  className="gradebook-set-link"
                  to={`/study-sets/${assignment.set_id}`}
                >
                  <b>{assignment.study_set_title}</b>
                </Link>
              ) : (
                <b>{assignment.study_set_title}</b>
              )}
            </span>

            <span>
              ⏰ Hạn nộp:{" "}
              {deadlineInfo ? (
                deadlineInfo.isPast ? (
                  <span className="deadline-badge expired">
                    ⚠️ Đã hết hạn ({deadlineInfo.formatted})
                  </span>
                ) : (
                  <span className="deadline-badge active">
                    {deadlineInfo.formatted}
                  </span>
                )
              ) : (
                <span className="deadline-badge none">Không giới hạn</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="gradebook-summary-grid">
        <div className="gradebook-stat-card">
          <span className="stat-label">Tổng học sinh</span>
          <span className="stat-number">{summary.total_students ?? 0}</span>
        </div>
        <div className="gradebook-stat-card card-completed">
          <span className="stat-label">Đã hoàn thành</span>
          <span className="stat-number text-green">{summary.completed_count ?? 0}</span>
        </div>
        <div className="gradebook-stat-card card-in-progress">
          <span className="stat-label">Đang làm</span>
          <span className="stat-number text-amber">{summary.in_progress_count ?? 0}</span>
        </div>
        <div className="gradebook-stat-card card-not-started">
          <span className="stat-label">Chưa làm</span>
          <span className="stat-number text-slate">{summary.not_started_count ?? 0}</span>
        </div>
        <div className="gradebook-stat-card card-overdue">
          <span className="stat-label">Quá hạn</span>
          <span className="stat-number text-rose">{summary.overdue_count ?? 0}</span>
        </div>
        <div className="gradebook-stat-card card-rate">
          <span className="stat-label">Tỷ lệ hoàn thành</span>
          <span className="stat-number">{summary.completion_rate ?? 0}%</span>
        </div>
        <div className="gradebook-stat-card card-avg">
          <span className="stat-label">Điểm trung bình</span>
          <span className="stat-number">
            {summary.average_score !== null && summary.average_score !== undefined
              ? `${summary.average_score}%`
              : "-"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gradebook-toolbar">
        <div className="gradebook-search-box">
          <input
            type="text"
            className="gradebook-search-input"
            placeholder="🔍 Tìm theo tên, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="gradebook-filters">
          <div className="gradebook-filter-tabs">
            <button
              className={`filter-pill ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              Tất cả ({summary.total_students ?? 0})
            </button>
            <button
              className={`filter-pill ${statusFilter === "OVERDUE" ? "active" : ""}`}
              onClick={() => setStatusFilter("OVERDUE")}
            >
              Quá hạn ({summary.overdue_count ?? 0})
            </button>
            <button
              className={`filter-pill ${statusFilter === "IN_PROGRESS" ? "active" : ""}`}
              onClick={() => setStatusFilter("IN_PROGRESS")}
            >
              Đang làm ({summary.in_progress_count ?? 0})
            </button>
            <button
              className={`filter-pill ${statusFilter === "NOT_STARTED" ? "active" : ""}`}
              onClick={() => setStatusFilter("NOT_STARTED")}
            >
              Chưa làm ({summary.not_started_count ?? 0})
            </button>
            <button
              className={`filter-pill ${statusFilter === "COMPLETED" ? "active" : ""}`}
              onClick={() => setStatusFilter("COMPLETED")}
            >
              Đã hoàn thành ({summary.completed_count ?? 0})
            </button>
          </div>

          <div className="gradebook-sort-wrapper">
            <label className="sort-label">Sắp xếp:</label>
            <select
              className="gradebook-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="priority">Trạng thái ưu tiên</option>
              <option value="name">Tên học sinh (A-Z)</option>
              <option value="score">Điểm số (Cao - Thấp)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Table */}
      {summary.total_students === 0 ? (
        <div className="empty-panel" style={{marginTop: "20px"}}>
          <h3>Lớp chưa có học sinh.</h3>
          <p className="muted" style={{marginTop: "8px"}}>
            Chia sẻ mã tham gia lớp để học sinh tham gia và làm bài tập.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-panel" style={{marginTop: "20px"}}>
          <h3>Không tìm thấy học sinh nào phù hợp.</h3>
          <p className="muted" style={{marginTop: "8px"}}>
            Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
          </p>
          <button
            className="button-small button-outline"
            style={{marginTop: "12px"}}
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="gradebook-table-container">
          <table className="gradebook-table">
            <thead>
              <tr>
                <th style={{width: "40px"}}>#</th>
                <th>Học sinh</th>
                <th>Trạng thái</th>
                <th>Điểm số</th>
                <th>Bắt đầu</th>
                <th>Nộp bài</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const statusInfo = STATUS_MAP[student.status] || STATUS_MAP.NOT_STARTED;
                const isTest = assignment.mode === "TEST";
                const hasScore =
                  student.status === "COMPLETED" &&
                  student.score !== null &&
                  student.score !== undefined;

                return (
                  <tr key={student.user_id}>
                    <td className="col-index">{index + 1}</td>
                    <td className="col-student">
                      <div className="student-cell">
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt={student.full_name || student.username}
                            className="student-avatar"
                          />
                        ) : (
                          <div className="student-avatar-placeholder">
                            {(student.full_name || student.username || "?")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="student-info">
                          <span className="student-name">
                            {student.full_name || student.username}
                          </span>
                          <span className="student-sub">
                            @{student.username}
                            {student.email ? ` · ${student.email}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-status">
                      <span className={`submission-badge ${statusInfo.className}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td className="col-score">
                      {isTest ? (
                        hasScore ? (
                          <span className="score-badge font-bold">
                            {student.score}%
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="col-time">{formatDateTime(student.started_at)}</td>
                    <td className="col-time">{formatDateTime(student.submitted_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
