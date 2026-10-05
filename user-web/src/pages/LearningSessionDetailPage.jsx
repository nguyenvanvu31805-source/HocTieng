import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSessionDetail } from "../services/studySessionService";
import { getErrorMessage } from "../utils/errors";
import {
  formatDateTime,
  formatDuration,
  getModeMeta,
} from "./LearningHistoryPage";
import "./LearningHistory.css";

export default function LearningSessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSessionDetail(sessionId);
      if (data) {
        setSession(data);
      } else {
        setError("Không tìm thấy thông tin phiên học này.");
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải chi tiết phiên học.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="learning-detail-page">
        <div className="learning-state-card">
          <div className="learning-loading-spinner" />
          <p className="muted">Đang tải chi tiết phiên học...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="learning-detail-page">
        <div className="learning-detail-nav">
          <Link to="/my-learning" className="learning-back-link">
            ← Quay lại Lịch sử học tập
          </Link>
        </div>
        <div className="learning-state-card learning-error-card">
          <p style={{ color: "#dc2626", fontWeight: 600 }}>
            {error || "Phiên học không tồn tại."}
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button type="button" className="button-small" onClick={fetchDetail}>
              Thử lại
            </button>
            <button
              type="button"
              className="button-small"
              style={{ background: "#475569" }}
              onClick={() => navigate("/my-learning")}
            >
              Về danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modeMeta = getModeMeta(session.mode);
  const isCompleted = session.status === "COMPLETED" || Boolean(session.ended_at);
  const displayTitle =
    session.set_title ||
    (session.mode === "WEAK_REVIEW" ? "Ôn tập từ vựng yếu" : "Học phần không tên");

  const studyRoute = session.set_id
    ? `/study-sets/${session.set_id}/${modeMeta.routeSuffix || "flashcards"}`
    : session.mode === "WEAK_REVIEW"
      ? "/review/weak"
      : null;

  return (
    <div className="learning-detail-page">
      {/* Navigation */}
      <div className="learning-detail-nav">
        <Link to="/my-learning" className="learning-back-link">
          ← Quay lại Lịch sử học tập
        </Link>
      </div>

      {/* Main Detail Card */}
      <div className="learning-detail-card">
        {/* Top Header */}
        <div className="learning-detail-header">
          <div className="learning-detail-badges">
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
              {isCompleted ? "✓ Đã hoàn thành" : "⏳ Đang học"}
            </span>

            {session.set_category && (
              <span className="learning-category-tag">{session.set_category}</span>
            )}
          </div>

          <h1 className="learning-detail-title">{displayTitle}</h1>

          {session.set_description && (
            <p className="learning-detail-desc">{session.set_description}</p>
          )}
        </div>

        {/* Info Grid */}
        <div className="learning-detail-grid">
          <div className="learning-info-tile">
            <span className="info-tile-icon">🎯</span>
            <div>
              <div className="info-tile-label">Điểm số đạt được</div>
              <div className="info-tile-val">
                {session.score !== null && session.score !== undefined
                  ? `${Math.round(session.score)}%`
                  : "Không áp dụng"}
              </div>
            </div>
          </div>

          <div className="learning-info-tile">
            <span className="info-tile-icon">⏱️</span>
            <div>
              <div className="info-tile-label">Thời gian làm bài</div>
              <div className="info-tile-val">
                {formatDuration(session.duration_seconds)}
              </div>
            </div>
          </div>

          <div className="learning-info-tile">
            <span className="info-tile-icon">🃏</span>
            <div>
              <div className="info-tile-label">Số thẻ đã học</div>
              <div className="info-tile-val">
                {session.cards_studied || 0}
                {session.set_card_count ? (
                  <span className="info-tile-sub"> / {session.set_card_count} thẻ</span>
                ) : (
                  <span className="info-tile-sub"> thẻ</span>
                )}
              </div>
            </div>
          </div>

          <div className="learning-info-tile">
            <span className="info-tile-icon">🏷️</span>
            <div>
              <div className="info-tile-label">Chế độ học</div>
              <div className="info-tile-val" style={{ color: modeMeta.color }}>
                {modeMeta.label}
              </div>
            </div>
          </div>

          <div className="learning-info-tile">
            <span className="info-tile-icon">📅</span>
            <div>
              <div className="info-tile-label">Thời gian bắt đầu</div>
              <div className="info-tile-val info-tile-date">
                {formatDateTime(session.started_at) || "—"}
              </div>
            </div>
          </div>

          <div className="learning-info-tile">
            <span className="info-tile-icon">🏁</span>
            <div>
              <div className="info-tile-label">Thời gian hoàn thành</div>
              <div className="info-tile-val info-tile-date">
                {formatDateTime(session.ended_at) || "Chưa kết thúc"}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="learning-detail-actions">
          {studyRoute && (
            <Link to={studyRoute} className="button-primary">
              ⚡ Học lại ở chế độ {modeMeta.label}
            </Link>
          )}

          {session.set_id && (
            <Link
              to={`/study-sets/${session.set_id}`}
              className="button-small"
              style={{ background: "#475569" }}
            >
              📖 Xem chi tiết học phần
            </Link>
          )}

          {session.mode === "WEAK_REVIEW" && (
            <Link
              to="/weak-words"
              className="button-small"
              style={{ background: "#475569" }}
            >
              ⚠️ Quản lý danh sách từ yếu
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
