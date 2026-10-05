import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getSessions, getStudyStats } from "../services/studySessionService";
import { getErrorMessage } from "../utils/errors";
import "./LearningHistory.css";

export const MODE_CONFIG = {
  FLASHCARDS: {
    label: "Thẻ lật",
    icon: "🃏",
    color: "#4255FF",
    bgColor: "#EEF2FF",
    routeSuffix: "flashcards",
  },
  LEARN: {
    label: "Luyện tập",
    icon: "✍️",
    color: "#059669",
    bgColor: "#ECFDF5",
    routeSuffix: "learn",
  },
  TEST: {
    label: "Kiểm tra",
    icon: "📝",
    color: "#DC2626",
    bgColor: "#FEF2F2",
    routeSuffix: "test",
  },
  MATCH: {
    label: "Ghép thẻ",
    icon: "🧩",
    color: "#D97706",
    bgColor: "#FFFBEB",
    routeSuffix: "match",
  },
  WEAK_REVIEW: {
    label: "Ôn từ yếu",
    icon: "⚠️",
    color: "#EA580C",
    bgColor: "#FFF7ED",
    routeSuffix: "weak",
  },
};

export const getModeMeta = (mode) => {
  return (
    MODE_CONFIG[mode] || {
      label: mode || "Khác",
      icon: "📖",
      color: "#64748B",
      bgColor: "#F1F5F9",
      routeSuffix: "flashcards",
    }
  );
};

export const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0 giây";
  if (seconds < 60) return `${seconds} giây`;
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (mins < 60) {
    return remSecs > 0 ? `${mins} phút ${remSecs} giây` : `${mins} phút`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} giờ ${remMins} phút` : `${hours} giờ`;
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} · ${hours}:${minutes}`;
};

const FILTER_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "FLASHCARDS", label: "Thẻ lật" },
  { key: "LEARN", label: "Luyện tập" },
  { key: "TEST", label: "Kiểm tra" },
  { key: "MATCH", label: "Ghép thẻ" },
  { key: "WEAK_REVIEW", label: "Ôn từ yếu" },
];

export default function LearningHistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentMode = searchParams.get("mode") || "ALL";

  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [sessionsData, statsData] = await Promise.all([
        getSessions({
          mode: currentMode === "ALL" ? undefined : currentMode,
          limit: 100,
        }),
        getStudyStats().catch(() => null),
      ]);

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      if (statsData) setStats(statsData);
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải lịch sử học tập.");
    } finally {
      setLoading(false);
    }
  }, [currentMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (modeKey) => {
    if (modeKey === "ALL") {
      searchParams.delete("mode");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ mode: modeKey });
    }
  };

  return (
    <div className="learning-history-page">
      {/* Header Banner */}
      <div className="learning-history-header">
        <div>
          <span className="eyebrow" style={{ color: "#4255FF" }}>
            LỊCH SỬ HỌC TẬP
          </span>
          <h1>Việc học của tôi</h1>
          <p className="muted">
            Theo dõi toàn bộ lịch sử các phiên học thẻ lật, luyện tập, kiểm tra và ôn tập của bạn.
          </p>
        </div>

        <div className="learning-history-header-actions">
          <Link to="/explore" className="button-primary">
            + Khám phá học phần
          </Link>
        </div>
      </div>

      {/* Stats Summary Banner */}
      {stats && (
        <div className="study-stats-grid">
          <div className="study-stat-card">
            <span className="study-stat-icon">🔥</span>
            <div>
              <div className="study-stat-val">{stats.current_streak || 0} ngày</div>
              <div className="study-stat-lbl">Chuỗi học tập hiện tại</div>
            </div>
          </div>
          <div className="study-stat-card">
            <span className="study-stat-icon">📚</span>
            <div>
              <div className="study-stat-val">{stats.total_sessions || 0}</div>
              <div className="study-stat-lbl">Tổng phiên đã học</div>
            </div>
          </div>
          <div className="study-stat-card">
            <span className="study-stat-icon">⏱️</span>
            <div>
              <div className="study-stat-val">
                {formatDuration(stats.total_duration_seconds || 0)}
              </div>
              <div className="study-stat-lbl">Tổng thời gian học</div>
            </div>
          </div>
          <div className="study-stat-card">
            <span className="study-stat-icon">📅</span>
            <div>
              <div className="study-stat-val">{stats.total_study_days || 0} ngày</div>
              <div className="study-stat-lbl">Số ngày đã tham gia học</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="learning-filter-bar">
        <div className="learning-filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`learning-tab ${currentMode === tab.key ? "active" : ""}`}
              onClick={() => handleFilterChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="learning-state-card">
          <div className="learning-loading-spinner" />
          <p className="muted">Đang tải lịch sử học tập...</p>
        </div>
      ) : error ? (
        <div className="learning-state-card learning-error-card">
          <p style={{ color: "#dc2626", fontWeight: 600 }}>{error}</p>
          <button type="button" className="button-small" onClick={fetchData}>
            Thử lại
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="learning-state-card learning-empty-card">
          <span className="learning-empty-icon">📖</span>
          <h3>Chưa có lịch sử học tập nào</h3>
          <p className="muted">
            {currentMode === "ALL"
              ? "Khi bạn học thẻ lật, luyện tập, kiểm tra hoặc ghép thẻ, lịch sử học tập sẽ được lưu và hiển thị tại đây."
              : `Bạn chưa hoàn thành phiên học nào ở chế độ ${
                  MODE_CONFIG[currentMode]?.label || currentMode
                }.`}
          </p>
          <button
            type="button"
            className="button-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate("/explore")}
          >
            Bắt đầu học ngay
          </button>
        </div>
      ) : (
        <div className="learning-sessions-list">
          {sessions.map((session) => {
            const modeMeta = getModeMeta(session.mode);
            const isCompleted = session.status === "COMPLETED" || Boolean(session.ended_at);
            const displayTitle =
              session.set_title ||
              (session.mode === "WEAK_REVIEW" ? "Ôn tập từ vựng yếu" : "Học phần không tên");

            return (
              <div
                key={session.session_id}
                className="learning-session-card"
                onClick={() => navigate(`/my-learning/${session.session_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(`/my-learning/${session.session_id}`);
                  }
                }}
              >
                <div className="learning-card-header">
                  <div className="learning-card-header-left">
                    <span
                      className="learning-mode-badge"
                      style={{
                        backgroundColor: modeMeta.bgColor,
                        color: modeMeta.color,
                      }}
                    >
                      <span className="learning-mode-icon">{modeMeta.icon}</span>
                      {modeMeta.label}
                    </span>

                    <span
                      className={`learning-status-badge ${
                        isCompleted ? "status-completed" : "status-in-progress"
                      }`}
                    >
                      {isCompleted ? "✓ Hoàn thành" : "⏳ Đang học"}
                    </span>
                  </div>

                  <span className="learning-session-date">
                    {formatDateTime(session.started_at)}
                  </span>
                </div>

                <div className="learning-card-body">
                  <h3 className="learning-session-title">{displayTitle}</h3>
                  {session.set_category && (
                    <span className="learning-category-tag">{session.set_category}</span>
                  )}
                </div>

                <div className="learning-card-footer">
                  <div className="learning-metrics-row">
                    <span className="learning-metric">
                      🃏 <strong>{session.cards_studied || 0}</strong> thẻ
                    </span>
                    <span className="learning-metric">
                      ⏱️ <strong>{formatDuration(session.duration_seconds)}</strong>
                    </span>
                    {session.score !== null && session.score !== undefined && (
                      <span className="learning-metric learning-metric-score">
                        🎯 <strong>{Math.round(session.score)}%</strong>
                      </span>
                    )}
                  </div>

                  <span className="learning-view-detail-btn">
                    Xem chi tiết →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
