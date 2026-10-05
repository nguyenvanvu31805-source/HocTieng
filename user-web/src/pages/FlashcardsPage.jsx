import {useEffect, useState, useCallback, useRef} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import api from "../services/api";
import assignmentService from "../services/assignmentService";
import useStudySession from "../hooks/useStudySession";
import {getErrorMessage} from "../utils/errors";

export default function FlashcardsPage() {
  const {setId} = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const assignmentId = searchParams.get("assignmentId");
  const classId = searchParams.get("classId");

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const assignmentSubmittedRef = useRef(false);

  const {completeSession, recordCardStudied} = useStudySession({
    setId,
    mode: "FLASHCARDS",
  });

  const [state, setState] = useState({
    loading: true,
    error: "",
    notFound: false,
  });

  const fetchData = useCallback(async () => {
    setState({loading: true, error: "", notFound: false});
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);

    try {
      const setResponse = await api.get(`/study-sets/${setId}`);
      setStudySet(setResponse.data.data);

      const cardsUrl =
        filter && filter !== "all"
          ? `/study-sets/${setId}/cards?filter=${encodeURIComponent(filter)}`
          : `/study-sets/${setId}/cards`;

      const cardsResponse = await api.get(cardsUrl);
      setCards(cardsResponse.data.data || []);
      setState({loading: false, error: "", notFound: false});
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setState({
          loading: false,
          error: "Không tìm thấy bộ học.",
          notFound: true,
        });
      } else if (status === 403) {
        setState({
          loading: false,
          error: "Bạn không có quyền truy cập bộ học này.",
          notFound: false,
        });
      } else {
        setState({
          loading: false,
          error: getErrorMessage(error) || "Không thể tải Flashcards.",
          notFound: false,
        });
      }
    }
  }, [setId, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNext = useCallback(async () => {
    if (currentCardIndex < cards.length - 1) {
      recordCardStudied(currentCardIndex + 1);
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      recordCardStudied(cards.length);
      setIsCompleted(true);
      if (assignmentId && !assignmentSubmittedRef.current) {
        assignmentSubmittedRef.current = true;
        try {
          const completedSessionId = await completeSession({
            score: null,
            cardsStudied: cards.length,
          });
          if (completedSessionId) {
            await assignmentService.submitAssignment(assignmentId, {
              session_id: completedSessionId,
            });
            setAssignmentSubmitted(true);
          } else {
            setAssignmentError("Không thể xác thực phiên học để nộp bài.");
          }
        } catch (assignErr) {
          setAssignmentError(
            getErrorMessage(assignErr) ||
              "Không thể ghi nhận bài nộp. Vui lòng thử lại."
          );
        }
      }
    }
  }, [currentCardIndex, cards.length, assignmentId, completeSession, recordCardStudied]);

  const handlePrev = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  const handleJumpToCard = (index) => {
    setCurrentCardIndex(index);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  const playAudio = (e, url, term) => {
    e.stopPropagation();
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
        state.loading ||
        !cards.length ||
        isCompleted
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, state.loading, cards.length, isCompleted]);

  if (state.loading) {
    return (
      <div className="flashcards-page">
        <div className="empty-panel">Đang tải Flashcards...</div>
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div className="flashcards-page">
        <Link className="back-link" to="/">
          ← Quay lại trang chủ
        </Link>
        <div className="empty-panel">
          <h3>Không tìm thấy bộ học.</h3>
          <p className="muted">Bộ học này không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  const backDestination =
    assignmentId && classId ? `/classes/${classId}` : `/study-sets/${setId}`;
  const backLabel =
    assignmentId && classId ? "← Quay lại lớp học" : "← Quay lại bộ học";

  if (state.error) {
    return (
      <div className="flashcards-page">
        <Link className="back-link" to={backDestination}>
          {backLabel}
        </Link>
        <div className="form-error">Lỗi: {state.error}</div>
        <div className="flashcards-error-actions">
          <button className="button-primary" onClick={fetchData}>
            Thử lại
          </button>
          <button
            className="button-small button-outline"
            onClick={() => navigate(backDestination)}
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!cards.length) {
    const isFiltered = filter && filter !== "all";
    const filterMessage =
      filter === "unlearned"
        ? "Bạn đã học tất cả các từ trong bộ này rồi! 🎉"
        : filter === "review"
        ? "Hiện tại không có từ nào cần ôn tập ngay. Bạn đang làm rất tốt! 👏"
        : filter === "weak"
        ? "Tuyệt vời! Không có từ nào hay sai cần khắc phục. ✨"
        : filter === "mastered"
        ? "Chưa có từ nào đạt mức thành thạo. Hãy tiếp tục học nhé!"
        : "Vui lòng thêm thẻ vào bộ học trước khi ôn tập.";

    return (
      <div className="flashcards-page">
        <Link className="back-link" to={backDestination}>
          {backLabel}
        </Link>
        <div className="empty-panel">
          <h2>{isFiltered ? "Không có thẻ trong phạm vi này" : "Study Set này chưa có thẻ."}</h2>
          <p className="muted">{filterMessage}</p>
          <div style={{display: "flex", gap: "12px", justifyContent: "center", marginTop: "20px"}}>
            {isFiltered && (
              <button
                className="button-primary"
                onClick={() => setSearchParams({})}
              >
                📚 Học tất cả
              </button>
            )}
            <button
              className={isFiltered ? "button-small button-outline" : "button-primary"}
              onClick={() => navigate(backDestination)}
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flashcards-page">
        <div className="completion-card">
          <div className="completion-icon">Hoàn thành</div>
          <h2>Bạn đã hoàn thành bộ Flashcards!</h2>
          <p className="completion-subtitle">
            Bộ học: <strong>{studySet?.title}</strong>
          </p>

          {assignmentSubmitted && (
            <div className="assignment-success-banner">
              🎉 Bạn đã hoàn thành bài tập và nộp bài thành công!
            </div>
          )}
          {assignmentError && (
            <div className="form-error" style={{marginBottom: "16px"}}>
              {assignmentError}
            </div>
          )}

          <div className="completion-stats">
            <div className="stat-box">
              <span className="stat-number">{cards.length}</span>
              <span className="stat-label">Tổng số thẻ đã xem</span>
            </div>
          </div>
          <div className="completion-actions">
            {assignmentId && (
              <button
                className="button-primary"
                style={{backgroundColor: "#4f46e5", borderColor: "#4f46e5"}}
                onClick={() => {
                  if (classId) {
                    navigate(`/classes/${classId}`);
                  } else {
                    navigate("/classes");
                  }
                }}
              >
                🏫 Quay lại lớp học
              </button>
            )}
            <button className="button-secondary" onClick={handleRestart}>
              Học lại
            </button>
            <button
              className="button-small button-secondary"
              onClick={() => navigate(backDestination)}
            >
              {backLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  const progressPercent = Math.round(
    ((currentCardIndex + 1) / cards.length) * 100,
  );

  return (
    <div className="flashcards-page">
      <div className="flashcards-top-bar">
        <Link className="back-link" to={backDestination}>
          {backLabel}
        </Link>
        <div style={{display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap"}}>
          <h2 className="flashcards-set-title">{studySet?.title}</h2>
          {filter && filter !== "all" && (
            <span className="study-filter-pill-badge">
              {filter === "unlearned"
                ? "Chưa học"
                : filter === "review"
                ? "Cần ôn"
                : filter === "weak"
                ? "Hay sai"
                : "Đã thuộc"}
            </span>
          )}
        </div>
        <div className="flashcards-counter">
          Thẻ {currentCardIndex + 1} / {cards.length}
        </div>
      </div>

      <div className="flashcards-progress-container">
        <div
          className="flashcards-progress-bar"
          style={{width: `${progressPercent}%`}}
        />
      </div>

      <div className="flashcard-scene">
        <div
          className={`flashcard-container ${isFlipped ? "flipped" : ""}`}
          onClick={handleFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleFlip();
          }}
          aria-label={`Thẻ ${currentCardIndex + 1}: ${
            isFlipped ? "Định nghĩa" : "Thuật ngữ"
          }`}
        >
          {/* Card Front */}
          <div className="flashcard-face flashcard-front">
            <div className="card-face-header">
              <span className="card-face-tag">THUẬT NGỮ</span>
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                {Boolean(currentCard.audio_url && currentCard.audio_url.trim()) && (
                  <button
                    type="button"
                    className="audio-btn"
                    onClick={(e) => playAudio(e, currentCard.audio_url, currentCard.term)}
                    title="Phát âm"
                  >
                    🔊 Phát âm
                  </button>
                )}
                <span className="card-index-badge">
                  {String(currentCardIndex + 1).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="card-main-content">
              <h1 className="card-term">{currentCard.term}</h1>
              {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
                <span className="card-pronunciation">
                  {currentCard.pronunciation.trim()}
                </span>
              )}
            </div>

            <div className="card-face-footer">
              <span className="flip-hint">Nhấn hoặc gõ Space để lật thẻ</span>
            </div>
          </div>

          {/* Card Back */}
          <div className="flashcard-face flashcard-back">
            <div className="card-face-header">
              <span className="card-face-tag">ĐỊNH NGHĨA</span>
              {Boolean(currentCard.audio_url && currentCard.audio_url.trim()) && (
                <button
                  type="button"
                  className="audio-btn"
                  onClick={(e) => playAudio(e, currentCard.audio_url, currentCard.term)}
                  title="Phát âm"
                >
                  🔊 Phát âm
                </button>
              )}
            </div>

            <div className="card-main-content">
              <p className="card-definition">{currentCard.definition}</p>

              {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
                <span className="card-pronunciation" style={{marginTop: "8px", display: "inline-block"}}>
                  {currentCard.pronunciation.trim()}
                </span>
              )}

              {Boolean(currentCard.example && currentCard.example.trim()) && (
                <div className="card-example-box">
                  <span className="example-label">💬 Ví dụ:</span>
                  <p className="card-example">"{currentCard.example.trim()}"</p>
                </div>
              )}

              {currentCard.image_url && (
                <div className="card-image-wrapper">
                  <img
                    src={currentCard.image_url}
                    alt={currentCard.term}
                    className="card-media-image"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <div className="card-face-footer">
              <span className="flip-hint">Nhấn để quay lại thuật ngữ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flashcards-controls">
        <button
          className="control-btn prev-btn"
          onClick={handlePrev}
          disabled={currentCardIndex === 0}
          title="Card trước (Arrow Left)"
        >
          ← Trước
        </button>

        <button
          className="control-btn flip-btn"
          onClick={handleFlip}
          title="Lật thẻ (Space)"
        >
          Lật thẻ
        </button>

        <button
          className="control-btn next-btn"
          onClick={handleNext}
          title={
            currentCardIndex === cards.length - 1
              ? "Hoàn thành"
              : "Card tiếp theo (Arrow Right)"
          }
        >
          {currentCardIndex === cards.length - 1 ? "Hoàn thành" : "Tiếp theo →"}
        </button>
      </div>

      {/* Mini Navigation */}
      <div className="flashcards-mini-nav">
        <span className="mini-nav-label">Chuyển nhanh:</span>
        <div className="mini-nav-chips">
          {cards.map((card, idx) => (
            <button
              key={card.card_id || idx}
              className={`mini-chip ${idx === currentCardIndex ? "active" : ""}`}
              onClick={() => handleJumpToCard(idx)}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
