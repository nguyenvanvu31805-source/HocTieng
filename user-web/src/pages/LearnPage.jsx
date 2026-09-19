import {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";

const masteryLabels = {
  0: "Chưa học",
  1: "Đang học",
  2: "Đã nắm cơ bản",
  3: "Thành thạo",
};

const normalizeAnswer = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export default function LearnPage() {
  const {setId} = useParams();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [state, setState] = useState({loading: true, error: "", notFound: false});

  const progressList = useMemo(() => Object.values(progress), [progress]);
  const practicedCount = progressList.filter(
    (item) => item.correct_count > 0 || item.wrong_count > 0,
  ).length;

  const fetchData = useCallback(async () => {
    setState({loading: true, error: "", notFound: false});
    setSubmitError("");
    setCurrentCardIndex(0);
    setCurrentAnswer("");
    setAnswered(false);
    setIsCorrect(null);
    setCompleted(false);
    setCorrectCount(0);
    setWrongCount(0);

    try {
      const setResponse = await api.get(`/study-sets/${setId}`);
      setStudySet(setResponse.data.data);

      const [cardsResponse, progressResponse] = await Promise.all([
        api.get(`/study-sets/${setId}/cards`),
        api.get(`/progress/study-sets/${setId}`),
      ]);

      setCards(cardsResponse.data.data || []);
      const progressRaw = progressResponse.data.data;
      const progressItems = Array.isArray(progressRaw)
        ? progressRaw
        : progressRaw?.records || [];
      setProgress(
        progressItems.reduce((result, item) => {
          result[item.card_id] = item;
          return result;
        }, {}),
      );
      setState({loading: false, error: "", notFound: false});
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setState({
          loading: false,
          error: "Không tìm thấy bộ học.",
          notFound: true,
        });
      } else {
        setState({
          loading: false,
          error: getErrorMessage(error) || "Không thể tải bài luyện tập.",
          notFound: false,
        });
      }
    }
  }, [setId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentCard = cards[currentCardIndex];
  const currentProgress = currentCard ? progress[currentCard.card_id] : null;
  const accuracy =
    correctCount + wrongCount === 0
      ? 0
      : Math.round((correctCount / (correctCount + wrongCount)) * 100);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentCard || answered || isSaving || !currentAnswer.trim()) return;

    const correct =
      normalizeAnswer(currentAnswer) === normalizeAnswer(currentCard.definition);

    setIsSaving(true);
    setSubmitError("");

    try {
      const {data} = await api.post(
        `/progress/cards/${currentCard.card_id}/review`,
        {correct},
      );
      setProgress((prev) => ({...prev, [currentCard.card_id]: data.data}));
      setIsCorrect(correct);
      setAnswered(true);
      if (correct) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setWrongCount((prev) => prev + 1);
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error) || "Không thể lưu tiến độ học.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setCurrentAnswer("");
      setAnswered(false);
      setIsCorrect(null);
      setSubmitError("");
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setCurrentAnswer("");
    setAnswered(false);
    setIsCorrect(null);
    setCompleted(false);
    setCorrectCount(0);
    setWrongCount(0);
    setSubmitError("");
  };

  if (state.loading) {
    return (
      <div className="learn-page">
        <div className="empty-panel">Đang tải bài luyện tập...</div>
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div className="learn-page">
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

  if (state.error) {
    return (
      <div className="learn-page">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="form-error">Lỗi: {state.error}</div>
        <div className="learn-error-actions">
          <button className="button-primary" onClick={fetchData}>
            Thử lại
          </button>
          <button
            className="button-small button-outline"
            onClick={() => navigate(`/study-sets/${setId}`)}
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="learn-page">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="empty-panel">
          <h2>Study Set này chưa có thẻ để luyện tập.</h2>
          <p className="muted">Vui lòng thêm thẻ vào bộ học trước.</p>
          <button
            className="button-primary"
            onClick={() => navigate(`/study-sets/${setId}`)}
          >
            Quay lại bộ học
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="learn-page">
        <div className="completion-card">
          <div className="completion-icon">Hoàn thành</div>
          <h2>Bạn đã hoàn thành bài luyện tập!</h2>
          <p className="completion-subtitle">
            Bộ học: <strong>{studySet?.title}</strong>
          </p>
          <div className="learn-result-grid">
            <div className="stat-box">
              <span className="stat-number">{cards.length}</span>
              <span className="stat-label">Tổng số câu</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{correctCount}</span>
              <span className="stat-label">Đúng</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{wrongCount}</span>
              <span className="stat-label">Sai</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{accuracy}%</span>
              <span className="stat-label">Tỷ lệ đúng</span>
            </div>
          </div>
          <div className="completion-actions">
            <button className="button-primary" onClick={handleRestart}>
              Luyện tập lại
            </button>
            <button
              className="button-small button-secondary"
              onClick={() => navigate(`/study-sets/${setId}`)}
            >
              ← Quay lại bộ học
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="learn-page">
      <div className="learn-top-bar">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="learn-title-block">
          <span className="eyebrow">LUYỆN TẬP</span>
          <h1>{studySet?.title}</h1>
        </div>
        <div className="learn-counter">
          Câu {currentCardIndex + 1} / {cards.length}
        </div>
      </div>

      <div className="learn-progress-summary">
        <span>Tiến độ: {practicedCount} / {cards.length} thẻ đã luyện</span>
        <span>
          Mức độ hiện tại:{" "}
          <b>{masteryLabels[currentProgress?.mastery_level ?? 0]}</b>
        </span>
      </div>

      <div className="flashcards-progress-container">
        <div
          className="flashcards-progress-bar"
          style={{width: `${Math.round(((currentCardIndex + 1) / cards.length) * 100)}%`}}
        />
      </div>

      <form className="learn-card" onSubmit={handleSubmit}>
        <span className="card-face-tag">TỪ CẦN LUYỆN</span>
        <h2>{currentCard.term}</h2>
        {currentCard.pronunciation && (
          <span className="card-pronunciation">{currentCard.pronunciation}</span>
        )}
        <p className="learn-question">Nghĩa của từ này là gì?</p>
        <label className="learn-answer-label">
          <span>Câu trả lời của bạn</span>
          <input
            value={currentAnswer}
            onChange={(event) => setCurrentAnswer(event.target.value)}
            placeholder="Nhập câu trả lời..."
            disabled={answered || isSaving}
          />
        </label>

        {submitError && (
          <div className="form-error learn-submit-error">
            {submitError || "Không thể lưu tiến độ học."}
          </div>
        )}

        {answered && (
          <div
            className={`learn-answer-result ${
              isCorrect ? "learn-answer-correct" : "learn-answer-wrong"
            }`}
          >
            <strong>{isCorrect ? "Chính xác!" : "Chưa chính xác"}</strong>
            <span>
              Đáp án đúng: <b>{currentCard.definition}</b>
            </span>
            <span>
              Câu trả lời của bạn: <b>{currentAnswer}</b>
            </span>
          </div>
        )}

        <div className="learn-actions">
          {!answered ? (
            <button
              className="button-primary"
              type="submit"
              disabled={isSaving || !currentAnswer.trim()}
            >
              {isSaving ? "Đang lưu kết quả..." : "Kiểm tra"}
            </button>
          ) : (
            <button className="button-primary" type="button" onClick={handleNext}>
              {currentCardIndex === cards.length - 1
                ? "Hoàn thành"
                : "Tiếp theo"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
