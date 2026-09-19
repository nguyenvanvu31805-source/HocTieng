import {useEffect, useState, useCallback} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import api from "../services/api";
import {useAuth} from "../context/useAuth";
import {getErrorMessage} from "../utils/errors";

const INITIAL_CARD_FORM = {
  term: "",
  definition: "",
  pronunciation: "",
  example: "",
  image_url: "",
  audio_url: "",
};

export default function StudySetDetailPage() {
  const {setId} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [state, setState] = useState({loading: true, error: ""});

  // Bookmark & Progress state
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkNotice, setBookmarkNotice] = useState("");
  const [progressData, setProgressData] = useState(null);

  // Card Management States
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // null when adding
  const [cardForm, setCardForm] = useState(INITIAL_CARD_FORM);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const [deletingCard, setDeletingCard] = useState(null);
  const [deleteCardLoading, setDeleteCardLoading] = useState(false);

  // Study Set Edit & Delete States
  const [showEditSetModal, setShowEditSetModal] = useState(false);
  const [editSetForm, setEditSetForm] = useState({
    title: "",
    description: "",
    category: "",
    language: "English",
    visibility: "PUBLIC",
  });
  const [editSetLoading, setEditSetLoading] = useState(false);
  const [editSetError, setEditSetError] = useState("");

  const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);
  const [deleteSetLoading, setDeleteSetLoading] = useState(false);

  const fetchSetData = useCallback(() => {
    setState({loading: true, error: ""});
    setBookmarkNotice("");

    Promise.all([
      api.get(`/study-sets/${setId}`),
      api.get(`/study-sets/${setId}/cards`),
    ])
      .then(([setResponse, cardsResponse]) => {
        setStudySet(setResponse.data.data);
        setCards(cardsResponse.data.data || []);
      })
      .catch((error) =>
        setState({loading: false, error: getErrorMessage(error)}),
      )
      .finally(() => setState((current) => ({...current, loading: false})));
  }, [setId]);

  useEffect(() => {
    fetchSetData();
  }, [fetchSetData]);

  // Fetch Bookmark Status & Progress when user is logged in
  useEffect(() => {
    if (!user) {
      setBookmarked(false);
      setProgressData(null);
      return;
    }

    // Fetch bookmark status
    api
      .get(`/bookmarks/${setId}`)
      .then(({data}) => setBookmarked(Boolean(data?.data?.bookmarked)))
      .catch(() => setBookmarked(false));

    // Fetch progress data
    api
      .get(`/progress/study-sets/${setId}`)
      .then(({data}) => setProgressData(data?.data || null))
      .catch(() => setProgressData(null));
  }, [setId, user]);

  const isOwner = Boolean(
    user &&
      studySet &&
      (Number(user.user_id) === Number(studySet.creator_id) ||
        user.role === "ADMIN"),
  );

  const handleToggleBookmark = async () => {
    if (!user) {
      setBookmarkNotice("Vui lòng đăng nhập để lưu bộ học.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      return;
    }

    setBookmarkLoading(true);
    setBookmarkNotice("");

    try {
      if (bookmarked) {
        await api.delete(`/bookmarks/${setId}`);
        setBookmarked(false);
      } else {
        await api.post(`/bookmarks/${setId}`);
        setBookmarked(true);
      }
    } catch (error) {
      setBookmarkNotice(
        getErrorMessage(error) || "Không thể thực hiện. Vui lòng thử lại.",
      );
    } finally {
      setBookmarkLoading(false);
    }
  };

  // --- CARD MODAL ACTIONS ---
  const handleOpenAddCard = () => {
    setEditingCard(null);
    setCardForm(INITIAL_CARD_FORM);
    setCardError("");
    setShowCardModal(true);
  };

  const handleOpenEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      term: card.term || "",
      definition: card.definition || "",
      pronunciation: card.pronunciation || "",
      example: card.example || "",
      image_url: card.image_url || "",
      audio_url: card.audio_url || "",
    });
    setCardError("");
    setShowCardModal(true);
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!cardForm.term.trim()) {
      setCardError("Vui lòng nhập thuật ngữ.");
      return;
    }
    if (!cardForm.definition.trim()) {
      setCardError("Vui lòng nhập định nghĩa.");
      return;
    }

    setCardLoading(true);
    setCardError("");
    try {
      if (editingCard) {
        // Edit existing card via PATCH
        const {data} = await api.patch(`/cards/${editingCard.card_id}`, {
          term: cardForm.term.trim(),
          definition: cardForm.definition.trim(),
          pronunciation: cardForm.pronunciation.trim() || null,
          example: cardForm.example.trim() || null,
          image_url: cardForm.image_url.trim() || null,
          audio_url: cardForm.audio_url.trim() || null,
        });
        const updated = data?.data;
        setCards((prev) =>
          prev.map((c) => (c.card_id === updated.card_id ? updated : c)),
        );
      } else {
        // Add new card
        const {data} = await api.post(`/study-sets/${setId}/cards`, {
          term: cardForm.term.trim(),
          definition: cardForm.definition.trim(),
          pronunciation: cardForm.pronunciation.trim() || null,
          example: cardForm.example.trim() || null,
          image_url: cardForm.image_url.trim() || null,
          audio_url: cardForm.audio_url.trim() || null,
        });
        const created = data?.data;
        setCards((prev) => [...prev, created]);
        setStudySet((prev) =>
          prev ? {...prev, card_count: Number(prev.card_count || 0) + 1} : prev,
        );
      }
      setShowCardModal(false);
    } catch (err) {
      setCardError(getErrorMessage(err) || "Không thể lưu thẻ.");
    } finally {
      setCardLoading(false);
    }
  };

  // --- DELETE CARD ACTIONS ---
  const handleConfirmDeleteCard = async () => {
    if (!deletingCard) return;
    setDeleteCardLoading(true);
    try {
      await api.delete(`/cards/${deletingCard.card_id}`);
      setCards((prev) => prev.filter((c) => c.card_id !== deletingCard.card_id));
      setStudySet((prev) =>
        prev ? {...prev, card_count: Math.max(0, Number(prev.card_count || 0) - 1)} : prev,
      );
      setDeletingCard(null);
    } catch (err) {
      alert(getErrorMessage(err) || "Không thể xóa thẻ.");
    } finally {
      setDeleteCardLoading(false);
    }
  };

  // --- STUDY SET EDIT ACTIONS ---
  const handleOpenEditSet = () => {
    setEditSetForm({
      title: studySet.title || "",
      description: studySet.description || "",
      category: studySet.category || "",
      language: studySet.language || "English",
      visibility: studySet.visibility || "PUBLIC",
    });
    setEditSetError("");
    setShowEditSetModal(true);
  };

  const handleEditSetSubmit = async (e) => {
    e.preventDefault();
    if (!editSetForm.title.trim()) {
      setEditSetError("Vui lòng nhập tên bộ học.");
      return;
    }

    setEditSetLoading(true);
    setEditSetError("");
    try {
      const {data} = await api.patch(`/study-sets/${setId}`, {
        title: editSetForm.title.trim(),
        description: editSetForm.description.trim() || null,
        category: editSetForm.category.trim() || null,
        language: editSetForm.language,
        visibility: editSetForm.visibility,
      });
      const updated = data?.data;
      setStudySet((prev) => ({...prev, ...updated}));
      setShowEditSetModal(false);
    } catch (err) {
      setEditSetError(getErrorMessage(err) || "Không thể cập nhật bộ học.");
    } finally {
      setEditSetLoading(false);
    }
  };

  // --- STUDY SET DELETE ACTIONS ---
  const handleConfirmDeleteSet = async () => {
    setDeleteSetLoading(true);
    try {
      await api.delete(`/study-sets/${setId}`);
      navigate("/library");
    } catch (err) {
      alert(getErrorMessage(err) || "Không thể xóa bộ học.");
      setDeleteSetLoading(false);
    }
  };

  if (state.loading)
    return (
      <div className="detail-page">
        <Link className="back-link" to="/library">
          ← Quay lại thư viện
        </Link>
        <div className="empty-panel">Đang tải thông tin bộ học...</div>
      </div>
    );

  if (state.error)
    return (
      <div className="detail-page">
        <Link className="back-link" to="/library">
          ← Quay lại thư viện
        </Link>
        <div className="form-error">Lỗi: {state.error}</div>
      </div>
    );

  return (
    <div className="detail-page">
      <Link className="back-link" to="/library">
        ← Quay lại thư viện
      </Link>

      <div className="detail-heading">
        <div>
          <div className="title-row">
            <span className="eyebrow">BỘ HỌC / #{studySet.set_id}</span>
            <button
              className={`bookmark-btn ${bookmarked ? "active" : ""}`}
              onClick={handleToggleBookmark}
              disabled={bookmarkLoading}
              title={bookmarked ? "Bỏ lưu bộ học" : "Lưu bộ học này"}
            >
              {bookmarkLoading
                ? "Đang lưu..."
                : bookmarked
                ? "★ Đã lưu"
                : "☆ Lưu"}
            </button>
          </div>

          {bookmarkNotice && (
            <div className="bookmark-notice">{bookmarkNotice}</div>
          )}

          <h1>{studySet.title}</h1>
          <p className="muted">{studySet.description || "Chưa có mô tả."}</p>

          <div className="detail-info">
            <span>
              Người tạo:{" "}
              <b>
                {studySet.creator_full_name ||
                  studySet.creator_username ||
                  `Người dùng #${studySet.creator_id}`}
              </b>
            </span>
            <span>
              Danh mục: <b>{studySet.category || "—"}</b>
            </span>
            <span>
              Ngôn ngữ: <b>{studySet.language || "—"}</b>
            </span>
            <span>{studySet.card_count} thẻ từ</span>
          </div>

          {/* Owner Management Toolbar */}
          {isOwner && (
            <div className="owner-toolbar">
              <span className="owner-toolbar-label">
                ⚙️ Quản lý bộ học
              </span>
              <button
                type="button"
                className="button-small button-primary"
                onClick={handleOpenAddCard}
                style={{display: "inline-flex", alignItems: "center", gap: "6px"}}
              >
                <span>+</span> Thêm thẻ
              </button>
              <button
                type="button"
                className="button-small button-outline"
                onClick={handleOpenEditSet}
              >
                ✏️ Chỉnh sửa bộ học
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={() => setShowDeleteSetConfirm(true)}
              >
                🗑️ Xóa bộ học
              </button>
            </div>
          )}
        </div>

        <div className="mode-actions">
          <Link
            className="mode-btn mode-btn-primary"
            to={`/study-sets/${setId}/flashcards`}
          >
            🎴 Thẻ lật
          </Link>
          <Link className="mode-btn" to={`/study-sets/${setId}/learn`}>
            🧠 Luyện tập
          </Link>
          <Link className="mode-btn" to={`/study-sets/${setId}/test`}>
            📝 Kiểm tra
          </Link>
          <Link className="mode-btn" to={`/study-sets/${setId}/match`}>
            🧩 Ghép thẻ
          </Link>
        </div>
      </div>

      {/* Progress Section */}
      <div className="detail-progress-panel">
        {user ? (
          progressData ? (
            <div className="progress-summary-box">
              <div className="progress-header">
                <div>
                  <h3 className="progress-title">Tiến độ học của bạn</h3>
                  <span className="progress-count">
                    {progressData.studied_cards} / {progressData.total_cards} thẻ đã học
                  </span>
                </div>
                <span className="progress-percentage-badge">
                  {progressData.progress_percent}%
                </span>
              </div>

              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{width: `${progressData.progress_percent}%`}}
                />
              </div>

              {progressData.mastery && (
                <div className="mastery-grid">
                  <div className="mastery-chip level-not-started">
                    <span className="mastery-count">
                      {progressData.mastery.not_started}
                    </span>
                    <span className="mastery-label">Chưa học</span>
                  </div>
                  <div className="mastery-chip level-learning">
                    <span className="mastery-count">
                      {progressData.mastery.learning}
                    </span>
                    <span className="mastery-label">Đang học</span>
                  </div>
                  <div className="mastery-chip level-basic">
                    <span className="mastery-count">
                      {progressData.mastery.basic}
                    </span>
                    <span className="mastery-label">Đã nắm cơ bản</span>
                  </div>
                  <div className="mastery-chip level-mastered">
                    <span className="mastery-count">
                      {progressData.mastery.mastered}
                    </span>
                    <span className="mastery-label">Thành thạo</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="progress-login-banner">
              <span>Đang tải tiến độ học...</span>
            </div>
          )
        ) : (
          <div className="progress-login-banner">
            <span>💡 Đăng nhập để lưu bộ học và theo dõi tiến độ học của bạn.</span>
            <Link className="button-small button-outline" to="/login">
              Đăng nhập ngay
            </Link>
          </div>
        )}
      </div>

      <div className="detail-meta">
        <span>{cards.length} thẻ được tải</span>
        <span>
          {studySet.visibility === "PRIVATE"
            ? "🔒 Bộ học riêng tư"
            : "🌐 Bộ học công khai"}
        </span>
      </div>

      {!cards.length ? (
        <div className="empty-panel">
          <h3>Bộ học này chưa có thẻ từ.</h3>
          {isOwner ? (
            <>
              <p className="muted" style={{marginTop: "8px"}}>
                Hãy bấm &quot;+ Thêm thẻ&quot; để bắt đầu bổ sung từ vựng vào bộ học của bạn!
              </p>
              <button
                className="button-primary"
                style={{marginTop: "20px", cursor: "pointer"}}
                onClick={handleOpenAddCard}
              >
                + Thêm thẻ ngay
              </button>
            </>
          ) : (
            <p className="muted" style={{marginTop: "8px"}}>
              Chủ sở hữu chưa thêm thẻ vào bộ học này.
            </p>
          )}
        </div>
      ) : (
        <div className="card-list">
          {cards.map((card, index) => (
            <article
              className={`vocab-row ${isOwner ? "is-owner" : ""}`}
              key={card.card_id}
            >
              <span className="vocab-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{card.term}</h3>
                <div style={{display: "flex", alignItems: "center", gap: "8px", marginTop: "4px"}}>
                  <span className="pronunciation">
                    {card.pronunciation || "Chưa có phát âm"}
                  </span>
                  {(card.audio_url || card.term) && (
                    <button
                      type="button"
                      className="btn-card-action"
                      style={{padding: "2px 8px", fontSize: "11px", lineHeight: "1.4"}}
                      onClick={() => {
                        if (card.audio_url) {
                          const audio = new Audio(card.audio_url);
                          audio.play().catch(() => {
                            if ("speechSynthesis" in window) {
                              window.speechSynthesis.cancel();
                              const u = new SpeechSynthesisUtterance(card.term);
                              u.lang = "en-US";
                              window.speechSynthesis.speak(u);
                            }
                          });
                        } else if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                          const u = new SpeechSynthesisUtterance(card.term);
                          u.lang = "en-US";
                          window.speechSynthesis.speak(u);
                        }
                      }}
                      title="Nghe phát âm"
                    >
                      🔊 Nghe
                    </button>
                  )}
                </div>
              </div>
              <p>{card.definition}</p>
              <div>
                <p className="example">{card.example || "Chưa có ví dụ."}</p>
                {card.image_url && (
                  <img
                    className="card-image"
                    src={card.image_url}
                    alt={card.term}
                    style={{marginTop: "8px", maxWidth: "120px", borderRadius: "4px"}}
                  />
                )}
              </div>

              {isOwner && (
                <div className="vocab-actions">
                  <button
                    type="button"
                    className="btn-card-action btn-card-edit"
                    onClick={() => handleOpenEditCard(card)}
                    title="Sửa thẻ này"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-card-action btn-card-delete"
                    onClick={() => setDeletingCard(card)}
                    title="Xóa thẻ này"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ADD / EDIT CARD MODAL */}
      {showCardModal && (
        <div
          className="modal-overlay"
          onClick={() => !cardLoading && setShowCardModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCard ? "Chỉnh sửa thẻ" : "Thêm thẻ mới"}</h2>
              <button
                className="modal-close-btn"
                onClick={() => !cardLoading && setShowCardModal(false)}
              >
                ✕
              </button>
            </div>

            {cardError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {cardError}
              </div>
            )}

            <form onSubmit={handleCardSubmit}>
              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Thuật ngữ *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: student"
                  value={cardForm.term}
                  onChange={(e) =>
                    setCardForm({...cardForm, term: e.target.value})
                  }
                  required
                  autoFocus
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Định nghĩa *
                </label>
                <textarea
                  rows="2"
                  placeholder="Ví dụ: sinh viên, học sinh"
                  value={cardForm.definition}
                  onChange={(e) =>
                    setCardForm({...cardForm, definition: e.target.value})
                  }
                  required
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)", resize: "vertical"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Phát âm
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: /ˈstuːdənt/"
                  value={cardForm.pronunciation}
                  onChange={(e) =>
                    setCardForm({...cardForm, pronunciation: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Ví dụ câu
                </label>
                <textarea
                  rows="2"
                  placeholder="Ví dụ: I am a university student."
                  value={cardForm.example}
                  onChange={(e) =>
                    setCardForm({...cardForm, example: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)", resize: "vertical"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Hình ảnh (URL nếu có)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={cardForm.image_url}
                  onChange={(e) =>
                    setCardForm({...cardForm, image_url: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "20px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Âm thanh (URL nếu có)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/audio.mp3"
                  value={cardForm.audio_url}
                  onChange={(e) =>
                    setCardForm({...cardForm, audio_url: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-small button-outline"
                  onClick={() => setShowCardModal(false)}
                  disabled={cardLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-small button-primary"
                  disabled={cardLoading}
                >
                  {cardLoading ? "Đang lưu..." : "Lưu thẻ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CARD CONFIRM MODAL */}
      {deletingCard && (
        <div
          className="modal-overlay"
          onClick={() => !deleteCardLoading && setDeletingCard(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xác nhận xóa thẻ</h2>
              <button
                className="modal-close-btn"
                onClick={() => !deleteCardLoading && setDeletingCard(null)}
              >
                ✕
              </button>
            </div>
            <p style={{marginBottom: "14px"}}>
              Bạn có chắc muốn xóa thẻ này?
            </p>
            <div
              style={{
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                marginBottom: "20px",
              }}
            >
              <strong style={{fontSize: "15px", display: "block"}}>{deletingCard.term}</strong>
              <span className="muted" style={{fontSize: "13px"}}>{deletingCard.definition}</span>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button-small button-outline"
                onClick={() => setDeletingCard(null)}
                disabled={deleteCardLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button-danger-solid"
                onClick={handleConfirmDeleteCard}
                disabled={deleteCardLoading}
              >
                {deleteCardLoading ? "Đang xóa..." : "Xóa thẻ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDY SET MODAL */}
      {showEditSetModal && (
        <div
          className="modal-overlay"
          onClick={() => !editSetLoading && setShowEditSetModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chỉnh sửa bộ học</h2>
              <button
                className="modal-close-btn"
                onClick={() => !editSetLoading && setShowEditSetModal(false)}
              >
                ✕
              </button>
            </div>

            {editSetError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {editSetError}
              </div>
            )}

            <form onSubmit={handleEditSetSubmit}>
              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Tên bộ học *
                </label>
                <input
                  type="text"
                  value={editSetForm.title}
                  onChange={(e) =>
                    setEditSetForm({...editSetForm, title: e.target.value})
                  }
                  required
                  autoFocus
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Mô tả
                </label>
                <textarea
                  rows="3"
                  value={editSetForm.description}
                  onChange={(e) =>
                    setEditSetForm({...editSetForm, description: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)", resize: "vertical"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Danh mục
                </label>
                <input
                  type="text"
                  value={editSetForm.category}
                  onChange={(e) =>
                    setEditSetForm({...editSetForm, category: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Ngôn ngữ
                </label>
                <select
                  value={editSetForm.language}
                  onChange={(e) =>
                    setEditSetForm({...editSetForm, language: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)", background: "white"}}
                >
                  <option value="English">English</option>
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="Tiếng Nhật">Tiếng Nhật</option>
                  <option value="Tiếng Hàn">Tiếng Hàn</option>
                  <option value="Tiếng Trung">Tiếng Trung</option>
                  <option value="Tiếng Pháp">Tiếng Pháp</option>
                  <option value="Tiếng Đức">Tiếng Đức</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="form-group" style={{marginBottom: "20px"}}>
                <label style={{display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "12px"}}>
                  Quyền riêng tư
                </label>
                <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                  <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px"}}>
                    <input
                      type="radio"
                      name="detail-edit-visibility"
                      value="PUBLIC"
                      checked={editSetForm.visibility === "PUBLIC"}
                      onChange={() =>
                        setEditSetForm({...editSetForm, visibility: "PUBLIC"})
                      }
                    />
                    <span>🌐 Công khai (Mọi người có thể xem và học)</span>
                  </label>
                  <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px"}}>
                    <input
                      type="radio"
                      name="detail-edit-visibility"
                      value="PRIVATE"
                      checked={editSetForm.visibility === "PRIVATE"}
                      onChange={() =>
                        setEditSetForm({...editSetForm, visibility: "PRIVATE"})
                      }
                    />
                    <span>🔒 Riêng tư (Chỉ mình bạn xem và quản lý)</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-small button-outline"
                  onClick={() => setShowEditSetModal(false)}
                  disabled={editSetLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-small button-primary"
                  disabled={editSetLoading}
                >
                  {editSetLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE STUDY SET CONFIRM MODAL */}
      {showDeleteSetConfirm && (
        <div
          className="modal-overlay"
          onClick={() => !deleteSetLoading && setShowDeleteSetConfirm(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xác nhận xóa bộ học</h2>
              <button
                className="modal-close-btn"
                onClick={() => !deleteSetLoading && setShowDeleteSetConfirm(false)}
              >
                ✕
              </button>
            </div>
            <p style={{marginBottom: "10px"}}>
              Bạn có chắc chắn muốn xóa bộ học:
            </p>
            <div
              style={{
                padding: "12px 16px",
                background: "#fef2f2",
                borderRadius: "6px",
                border: "1px solid #fecaca",
                marginBottom: "16px",
              }}
            >
              <strong style={{color: "#b91c1c", fontSize: "16px", display: "block"}}>
                {studySet.title}
              </strong>
              <small style={{color: "#991b1b", display: "block", marginTop: "4px"}}>
                ⚠️ Toàn bộ thẻ và dữ liệu học tập liên quan sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </small>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button-small button-outline"
                onClick={() => setShowDeleteSetConfirm(false)}
                disabled={deleteSetLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button-danger-solid"
                onClick={handleConfirmDeleteSet}
                disabled={deleteSetLoading}
              >
                {deleteSetLoading ? "Đang xóa..." : "Xóa bộ học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
