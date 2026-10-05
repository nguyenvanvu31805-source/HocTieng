import {Link} from "react-router-dom";

export default function StudySetCard({studySet, showActions = false, onEdit}) {
  const isPrivate = studySet.visibility === "PRIVATE";

  if (showActions) {
    return (
      <div className="study-set-card study-set-card-managed">
        <Link className="study-set-card-link" to={`/study-sets/${studySet.set_id}`}>
          <div className="study-set-card-top">
            <span className="set-category-badge">{studySet.category || "Từ vựng"}</span>
            <span
              className={`set-visibility-badge ${isPrivate ? "badge-private" : "badge-public"}`}
            >
              {isPrivate ? "🔒 Riêng tư" : "🌐 Công khai"}
            </span>
          </div>

          <h3 className="study-set-card-title">{studySet.title}</h3>
          <p className="study-set-card-desc">
            {studySet.description || "Chưa có mô tả cho bộ từ vựng này."}
          </p>

          <div className="study-set-card-meta">
            <span className="set-meta-tag">{studySet.language || "English"}</span>
            <span className="set-card-count">🃏 {studySet.card_count} thẻ</span>
          </div>

          <div className="study-set-card-footer">
            <small className="study-set-date">
              Cập nhật {new Date(studySet.updated_at || studySet.created_at).toLocaleDateString("vi-VN")}
            </small>
          </div>
        </Link>

        <div className="study-set-card-actions">
          <Link
            className="button-small button-lime"
            style={{flex: 1, textAlign: "center"}}
            to={`/study-sets/${studySet.set_id}`}
          >
            Học ngay →
          </Link>
          {onEdit && (
            <button
              type="button"
              className="button-small button-outline"
              style={{flex: 1}}
              onClick={() => onEdit(studySet)}
            >
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link className="study-set-card" to={`/study-sets/${studySet.set_id}`}>
      <div className="study-set-card-top">
        <span className="set-category-badge">{studySet.category || "Từ vựng"}</span>
        <span className="set-language-pill">{studySet.language || "English"}</span>
      </div>

      <h3 className="study-set-card-title">{studySet.title}</h3>
      <p className="study-set-card-desc">
        {studySet.description || "Chưa có mô tả cho bộ từ vựng này."}
      </p>

      <div className="study-set-card-meta">
        <span className="study-set-author">
          👤 {studySet.creator_full_name ||
            studySet.creator_username ||
            `Người dùng #${studySet.creator_id}`}
        </span>
        <span className="set-card-count">🃏 {studySet.card_count} thẻ</span>
      </div>

      <div className="study-set-card-footer">
        <small className="study-set-date">
          Cập nhật {new Date(studySet.updated_at || studySet.created_at).toLocaleDateString("vi-VN")}
        </small>
        <span className="study-set-cta">Học ngay →</span>
      </div>
    </Link>
  );
}
