import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getWeakCards, reviewCard } from "../services/progressService";
import { getErrorMessage } from "../utils/errors";

function checkAnswer(userAnswer, targetDefinition) {
  const normUser = String(userAnswer || "").trim().toLowerCase();
  const normTarget = String(targetDefinition || "").trim().toLowerCase();
  if (normUser === normTarget) return true;

  const strip = (str) => str.replace(/[.,?!;:'"~]+$/g, "").trim();
  if (strip(normUser) === strip(normTarget)) return true;

  const subDefs = normTarget.split(/[,;/]+/).map((item) => strip(item.trim())).filter(Boolean);
  if (subDefs.includes(strip(normUser))) return true;

  return false;
}

export default function WeakReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cardIdParam = searchParams.get("cardId");

  const [mode, setMode] = useState("flashcards"); // 'flashcards' | 'learn'
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Flashcards state
  const [isFlipped, setIsFlipped] = useState(false);

  // Learn state
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);

  // Session summary
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const playAudio = (e, url, term) => {
    e?.stopPropagation?.();
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {
        if ("speechSynthesis" in window && term) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(term);
          u.lang = "en-US";
          window.speechSynthesis.speak(u);
        }
      });
    } else if ("speechSynthesis" in window && term) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(term);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setCurrentIndex(0);
    setIsFlipped(false);
    setTypedAnswer("");
    setIsSubmitted(false);
    setIsAnswerCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
    setCompleted(false);

    try {
      const res = await getWeakCards({ limit: 50, filter: "all" });
      let list = res?.data?.items || [];

      if (cardIdParam) {
        const targetId = Number(cardIdParam);
        const targetCard = list.find((c) => c.card_id === targetId);
        if (targetCard) {
          list = [targetCard, ...list.filter((c) => c.card_id !== targetId)];
        }
      }

      setCards(list);
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải phiên ôn tập.");
    } finally {
      setLoading(false);
    }
  }, [cardIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Flashcard review handler
  const handleFlashcardReview = (correct) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    reviewCard(currentCard.card_id, correct).catch(() => {});

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setCompleted(true);
    }
  };

  // Learn review handler
  const handleLearnSubmit = (e) => {
    e?.preventDefault?.();
    const currentCard = cards[currentIndex];
    if (!currentCard || !typedAnswer.trim()) return;

    const correct = checkAnswer(typedAnswer, currentCard.definition);
    setIsAnswerCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    reviewCard(currentCard.card_id, correct).catch(() => {});
  };

  const handleLearnNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTypedAnswer("");
      setIsSubmitted(false);
      setIsAnswerCorrect(null);
    } else {
      setCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="weak-review-page">
        <div className="empty-panel">Đang chuẩn bị phiên ôn tập từ yếu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weak-review-page">
        <Link className="back-link" to="/weak-words">
          ← Quay lại Trung tâm từ yếu
        </Link>
        <div className="empty-panel">
          <p className="form-error">Lỗi: {error}</p>
          <button className="button-primary" style={{ marginTop: "12px" }} onClick={loadData}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="weak-review-page">
        <Link className="back-link" to="/weak-words">
          ← Quay lại Trung tâm từ yếu
        </Link>
        <div className="empty-panel weak-empty-panel">
          <span style={{ fontSize: "52px", display: "block", marginBottom: "12px" }}>🎉</span>
          <h2>Không còn từ yếu nào cần ôn!</h2>
          <p className="muted" style={{ margin: "10px 0 20px" }}>
            Bạn đã ôn tập xong tất cả các từ cần củng cố.
          </p>
          <Link className="button-primary" to="/weak-words">
            Quay lại danh sách từ yếu
          </Link>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (completed) {
    const total = cards.length;
    const score = Math.round((correctCount / total) * 100);

    return (
      <div className="weak-review-page">
        <div className="completion-card test-result-card">
          <div className="completion-icon" style={{ backgroundColor: "#ea580c" }}>
            Hoàn thành
          </div>
          <h2>{score >= 80 ? "Xuất sắc! 🎉" : "Hoàn thành phiên ôn tập! 👏"}</h2>
          <p className="completion-subtitle">
            Bạn đã ôn lại <strong>{total}</strong> từ yếu. Tiến độ học tập đã được cập nhật tự động!
          </p>

          <div className="test-result-grid" style={{ marginBottom: "28px" }}>
            <div className="stat-box">
              <span className="stat-number">{total}</span>
              <span className="stat-label">Tổng số từ</span>
            </div>
            <div className="stat-box">
              <span className="stat-number" style={{ color: "#15803d" }}>
                {correctCount}
              </span>
              <span className="stat-label">Đã nhớ</span>
            </div>
            <div className="stat-box">
              <span className="stat-number" style={{ color: "#dc2626" }}>
                {wrongCount}
              </span>
              <span className="stat-label">Cần luyện thêm</span>
            </div>
            <div className="stat-box">
              <span className="stat-number" style={{ color: "#ea580c" }}>
                {score}%
              </span>
              <span className="stat-label">Điểm số</span>
            </div>
          </div>

          <div className="completion-actions">
            <button className="button-primary" onClick={loadData}>
              🔄 Ôn tiếp từ yếu
            </button>
            <button
              className="button-small button-outline"
              onClick={() => navigate("/weak-words")}
            >
              ← Quay về Trung tâm từ yếu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="weak-review-page">
      {/* Top Header */}
      <div className="test-top-bar">
        <Link className="back-link" to="/weak-words">
          ← Quay lại Từ yếu
        </Link>
        <div className="test-title-block">
          <span className="eyebrow" style={{ color: "#ea580c" }}>
            ⚡ ÔN TỪ YẾU TOÀN CỤC
          </span>
          <h1>{currentQ.set_title}</h1>
        </div>
        <div className="weak-review-header-right">
          <div className="weak-mode-toggle">
            <button
              className={`mode-btn ${mode === "flashcards" ? "active" : ""}`}
              onClick={() => {
                setMode("flashcards");
                setIsFlipped(false);
              }}
            >
              🎴 Thẻ ghi nhớ
            </button>
            <button
              className={`mode-btn ${mode === "learn" ? "active" : ""}`}
              onClick={() => setMode("learn")}
            >
              ✍️ Luyện viết
            </button>
          </div>
          <span className="test-counter">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flashcards-progress-container" style={{ margin: "16px 0 24px" }}>
        <div
          className="flashcards-progress-bar"
          style={{ width: `${progressPercent}%`, backgroundColor: "#ea580c" }}
        />
      </div>

      {/* Mode Content */}
      {mode === "flashcards" ? (
        <div className="weak-flashcard-stage">
          <div
            className={`flashcard-scene ${isFlipped ? "flipped" : ""}`}
            onClick={() => setIsFlipped((prev) => !prev)}
            style={{ cursor: "pointer" }}
          >
            <div className="flashcard-inner">
              {/* Mặt trước: Term */}
              <div className="flashcard-face flashcard-front">
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span className="card-face-tag">THUẬT NGỮ</span>
                  {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
                    <button
                      type="button"
                      className="audio-btn"
                      onClick={(e) => playAudio(e, currentQ.audio_url, currentQ.term)}
                      title="Phát âm"
                    >
                      🔊 Phát âm
                    </button>
                  )}
                </div>
                <h2 className="card-term">{currentQ.term}</h2>
                {Boolean(currentQ.pronunciation && currentQ.pronunciation.trim()) && (
                  <span className="card-pronunciation">{currentQ.pronunciation.trim()}</span>
                )}
                <span className="flashcard-hint">Nhấn vào thẻ để xem định nghĩa 🔄</span>
              </div>

              {/* Mặt sau: Definition */}
              <div className="flashcard-face flashcard-back">
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span className="card-face-tag">ĐỊNH NGHĨA</span>
                  {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
                    <button
                      type="button"
                      className="audio-btn"
                      onClick={(e) => playAudio(e, currentQ.audio_url, currentQ.term)}
                      title="Phát âm"
                    >
                      🔊 Phát âm
                    </button>
                  )}
                </div>
                <p className="card-definition">{currentQ.definition}</p>
                {Boolean(currentQ.example && currentQ.example.trim()) && (
                  <div className="card-example-box" style={{ marginTop: "12px", width: "100%" }}>
                    <span className="example-label" style={{ color: "#ea580c" }}>
                      💬 Ví dụ:
                    </span>
                    <p className="card-example" style={{ margin: "4px 0 0 0" }}>
                      "{currentQ.example.trim()}"
                    </p>
                  </div>
                )}
                <span className="flashcard-hint">Nhấn vào thẻ để lật lại 🔄</span>
              </div>
            </div>
          </div>

          {/* Flashcard Action Buttons */}
          <div className="weak-flashcard-controls">
            <button
              className="control-btn weak-btn-wrong"
              type="button"
              onClick={() => handleFlashcardReview(false)}
            >
              ✕ Chưa thuộc
            </button>
            <button
              className="button-primary weak-btn-correct"
              type="button"
              onClick={() => handleFlashcardReview(true)}
            >
              ✓ Đã nhớ
            </button>
          </div>
        </div>
      ) : (
        /* Learn Mode */
        <section className="test-card" style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-face-tag">TỪ CẦN ÔN LẠI</span>
            {Boolean(currentQ.audio_url && currentQ.audio_url.trim()) && (
              <button
                type="button"
                className="audio-btn"
                onClick={(e) => playAudio(e, currentQ.audio_url, currentQ.term)}
                title="Phát âm"
              >
                🔊 Phát âm
              </button>
            )}
          </div>
          <h2>{currentQ.term}</h2>
          {Boolean(currentQ.pronunciation && currentQ.pronunciation.trim()) && (
            <span className="card-pronunciation">{currentQ.pronunciation.trim()}</span>
          )}

          <p className="test-question">Nghĩa của từ này là gì?</p>

          <form onSubmit={handleLearnSubmit}>
            <label className="test-answer-label">
              <span>Câu trả lời của bạn</span>
              <input
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Nhập nghĩa của từ..."
                disabled={isSubmitted}
                autoFocus
              />
            </label>

            {isSubmitted && (
              <div
                className={`card-example-box ${isAnswerCorrect ? "feedback-ok" : "feedback-err"}`}
                style={{
                  marginTop: "14px",
                  borderColor: isAnswerCorrect ? "#22c55e" : "#ef4444",
                  backgroundColor: isAnswerCorrect ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <strong style={{ color: isAnswerCorrect ? "#15803d" : "#dc2626" }}>
                  {isAnswerCorrect ? "✓ Chính xác!" : "✕ Chưa chính xác!"}
                </strong>
                {!isAnswerCorrect && (
                  <p style={{ margin: "6px 0 0 0", color: "#1e293b" }}>
                    Đáp án đúng: <strong>{currentQ.definition}</strong>
                  </p>
                )}
                {Boolean(currentQ.example && currentQ.example.trim()) && (
                  <p className="card-example" style={{ margin: "6px 0 0 0" }}>
                    💬 Ví dụ: "{currentQ.example.trim()}"
                  </p>
                )}
              </div>
            )}

            <div className="test-actions" style={{ marginTop: "20px" }}>
              {!isSubmitted ? (
                <button
                  className="button-primary"
                  type="submit"
                  disabled={!typedAnswer.trim()}
                  style={{ width: "100%" }}
                >
                  Kiểm tra câu trả lời
                </button>
              ) : (
                <button
                  className="button-primary"
                  type="button"
                  onClick={handleLearnNext}
                  style={{ width: "100%" }}
                >
                  {currentIndex < cards.length - 1 ? "Câu tiếp theo →" : "Xem kết quả 🎉"}
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
