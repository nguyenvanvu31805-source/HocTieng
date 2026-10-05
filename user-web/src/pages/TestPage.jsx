import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import api from "../services/api";
import assignmentService from "../services/assignmentService";
import {getErrorMessage} from "../utils/errors";

const normalizeAnswer = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const calculateScore = (correctAnswers, totalQuestions) =>
  Number(((correctAnswers / totalQuestions) * 100).toFixed(2));

export default function TestPage() {
  const {setId} = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const retryResultId = searchParams.get("retryResultId");
  const assignmentId = searchParams.get("assignmentId");
  const classId = searchParams.get("classId");
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [cards, setCards] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const assignmentSubmittedRef = useRef(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isRetrySession, setIsRetrySession] = useState(false);
  const [state, setState] = useState({loading: true, error: "", notFound: false});

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

  const fetchData = useCallback(async () => {
    setState({loading: true, error: "", notFound: false});
    setSubmitError("");
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setCompleted(false);
    setResult(null);
    setShowConfirmSubmit(false);

    try {
      const [setResponse, cardsResponse] = await Promise.all([
        api.get(`/study-sets/${setId}`),
        api.get(`/study-sets/${setId}/cards`),
      ]);

      const setData = setResponse.data.data;
      const nextCards = cardsResponse.data.data || [];
      setStudySet(setData);
      setAllCards(nextCards);

      if (!nextCards.length) {
        setCards([]);
        setAnswers([]);
        setIsRetrySession(false);
        setState({loading: false, error: "", notFound: false});
        return;
      }

      if (retryResultId) {
        try {
          const res = await api.get(`/test-results/${retryResultId}`);
          const prevResult = res.data.data;
          const incorrectIds = prevResult?.incorrect_card_ids || [];
          const wrongCards = nextCards.filter((c) => incorrectIds.includes(c.card_id));

          if (wrongCards.length > 0) {
            setCards(wrongCards);
            setAnswers(Array(wrongCards.length).fill(""));
            setIsRetrySession(true);
          } else {
            setCards(nextCards);
            setAnswers(Array(nextCards.length).fill(""));
            setIsRetrySession(false);
          }
        } catch (retryErr) {
          console.warn("Lỗi khi tải câu hỏi làm lại:", retryErr);
          setCards(nextCards);
          setAnswers(Array(nextCards.length).fill(""));
          setIsRetrySession(false);
        }
      } else {
        setCards(nextCards);
        setAnswers(Array(nextCards.length).fill(""));
        setIsRetrySession(false);
      }

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
          error: getErrorMessage(error) || "Không thể tải bài kiểm tra.",
          notFound: false,
        });
      }
    }
  }, [setId, retryResultId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentCard = cards[currentQuestionIndex];
  const answeredCount = useMemo(
    () => answers.filter((answer) => answer.trim()).length,
    [answers],
  );
  const unansweredCount = cards.length - answeredCount;

  const saveCurrentAnswer = (nextAnswer = currentAnswer) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = nextAnswer;
      return updated;
    });
  };

  const moveToQuestion = (nextIndex) => {
    saveCurrentAnswer();
    setCurrentQuestionIndex(nextIndex);
    setCurrentAnswer(answers[nextIndex] || "");
    setShowConfirmSubmit(false);
  };

  const handleAnswerChange = (value) => {
    setCurrentAnswer(value);
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = value;
      return updated;
    });
  };

  const buildResult = (finalAnswers) => {
    const details = cards.map((card, index) => {
      const userAnswer = finalAnswers[index] || "";
      const correct =
        normalizeAnswer(userAnswer) === normalizeAnswer(card.definition);
      return {card, userAnswer, correct, correctAnswer: card.definition};
    });
    const correctAnswers = details.filter((item) => item.correct).length;
    const totalQuestions = cards.length;
    return {
      totalQuestions,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      score: calculateScore(correctAnswers, totalQuestions),
      details,
    };
  };

  const submitTest = async () => {
    if (submitting || completed || !cards.length) return;

    const finalAnswers = [...answers];
    finalAnswers[currentQuestionIndex] = currentAnswer;
    setAnswers(finalAnswers);
    setSubmitting(true);
    setSubmitError("");
    setShowConfirmSubmit(false);

    const details = cards.map((card, index) => ({
      card_id: card.card_id,
      question_order: index + 1,
      user_answer: finalAnswers[index] || "",
    }));

    try {
      const {data} = await api.post("/test-results", {
        set_id: Number(setId),
        total_questions: cards.length,
        details,
      });

      const savedResult = data.data;
      if (savedResult?.details && savedResult.details.length > 0) {
        const resultDetails = savedResult.details.map((d) => ({
          card: {
            card_id: d.card_id,
            term: d.term,
            definition: d.correct_answer || d.definition,
            pronunciation: d.pronunciation,
            example: d.example,
            audio_url: d.audio_url,
          },
          userAnswer: d.user_answer || "",
          correctAnswer: d.correct_answer,
          correct: Boolean(d.is_correct),
        }));

        setResult({
          totalQuestions: savedResult.total_questions,
          correctAnswers: savedResult.correct_answers,
          wrongAnswers: savedResult.total_questions - savedResult.correct_answers,
          score:
            typeof savedResult.score === "string"
              ? parseFloat(savedResult.score)
              : savedResult.score,
          details: resultDetails,
          savedResult,
        });
      } else {
        const nextResult = buildResult(finalAnswers);
        setResult({...nextResult, savedResult});
      }
      setCompleted(true);

      if (assignmentId && savedResult?.result_id && !assignmentSubmittedRef.current) {
        assignmentSubmittedRef.current = true;
        try {
          await assignmentService.submitAssignment(assignmentId, {
            result_id: savedResult.result_id,
          });
          setAssignmentSubmitted(true);
        } catch (assignErr) {
          setAssignmentError(
            getErrorMessage(assignErr) ||
              "Không thể ghi nhận bài nộp. Vui lòng thử lại.",
          );
        }
      }
    } catch (error) {
      setSubmitError(
        getErrorMessage(error) || "Không thể lưu kết quả kiểm tra.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    saveCurrentAnswer();
    if (unansweredCount > 0) {
      setShowConfirmSubmit(true);
      return;
    }
    submitTest();
  };

  const handleRestartAll = () => {
    const targetCards = allCards.length ? allCards : cards;
    setCards(targetCards);
    setAnswers(Array(targetCards.length).fill(""));
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setCompleted(false);
    setResult(null);
    setSubmitError("");
    setShowConfirmSubmit(false);
    setIsRetrySession(false);
    setSearchParams({});
  };

  const handleRetryIncorrect = () => {
    if (!result) return;
    let wrongCardIds = [];
    if (result.savedResult?.incorrect_card_ids) {
      wrongCardIds = result.savedResult.incorrect_card_ids;
    } else {
      wrongCardIds = result.details
        .filter((d) => !d.correct)
        .map((d) => d.card.card_id);
    }

    if (!wrongCardIds.length) {
      alert("Chúc mừng! Bạn đã trả lời đúng tất cả các câu.");
      return;
    }

    const pool = allCards.length ? allCards : cards;
    const wrongCards = pool.filter((c) => wrongCardIds.includes(c.card_id));
    if (!wrongCards.length) {
      alert("Không tìm thấy thẻ câu sai để làm lại.");
      return;
    }

    setCards(wrongCards);
    setAnswers(Array(wrongCards.length).fill(""));
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setCompleted(false);
    setResult(null);
    setSubmitError("");
    setShowConfirmSubmit(false);
    setIsRetrySession(true);

    if (result.savedResult?.result_id) {
      setSearchParams({retryResultId: String(result.savedResult.result_id)});
    }
  };

  if (state.loading) {
    return (
      <div className="test-page">
        <div className="empty-panel">Đang tải bài kiểm tra...</div>
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div className="test-page">
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
      <div className="test-page">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="form-error">Lỗi: {state.error}</div>
        <div className="test-error-actions">
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
      <div className="test-page">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="empty-panel">
          <h2>Study Set này chưa có thẻ để kiểm tra.</h2>
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

  if (completed && result) {
    return (
      <div className="test-page">
        <div className="completion-card test-result-card">
          <div className="completion-icon">Hoàn thành</div>
          <h2>Bạn đã hoàn thành bài kiểm tra!</h2>
          <p className="completion-subtitle">
            Bạn làm đúng <strong>{result.correctAnswers}</strong> /{" "}
            <strong>{result.totalQuestions}</strong> câu.
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

          <div className="test-result-grid">
            <div className="stat-box">
              <span className="stat-number">{result.totalQuestions}</span>
              <span className="stat-label">Tổng số câu</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{result.correctAnswers}</span>
              <span className="stat-label">Số câu đúng</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{result.wrongAnswers}</span>
              <span className="stat-label">Số câu sai</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{result.score}%</span>
              <span className="stat-label">Điểm</span>
            </div>
          </div>

          <div className="test-detail-list">
            {result.details.map((item, index) => (
              <article
                className={`test-detail-item ${
                  item.correct ? "correct" : "wrong"
                }`}
                key={item.card?.card_id || index}
              >
                <span className="vocab-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                    <h3>{item.card.term}</h3>
                    {Boolean(item.card.audio_url && item.card.audio_url.trim()) && (
                      <button
                        type="button"
                        className="audio-btn"
                        onClick={(e) => playAudio(e, item.card.audio_url, item.card.term)}
                        title="Phát âm"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                  {Boolean(item.card.pronunciation && item.card.pronunciation.trim()) && (
                    <span className="card-pronunciation" style={{display: "inline-block", margin: "2px 0 6px 0"}}>
                      {item.card.pronunciation.trim()}
                    </span>
                  )}
                  <p>
                    Bạn trả lời:{" "}
                    <b style={{color: item.correct ? "#15803d" : "#dc2626"}}>
                      {item.userAnswer || "Chưa trả lời"}
                    </b>
                  </p>
                  {!item.correct && (
                    <p>
                      Đáp án đúng:{" "}
                      <b style={{color: "#15803d"}}>
                        {item.correctAnswer || item.card.definition}
                      </b>
                    </p>
                  )}
                  {item.correct && (
                    <p>
                      Đáp án: <b>{item.correctAnswer || item.card.definition}</b>
                    </p>
                  )}
                  {Boolean(item.card.example && item.card.example.trim()) && (
                    <div className="card-example-box" style={{marginTop: "8px"}}>
                      <span className="example-label">💬 Ví dụ:</span>
                      <p className="card-example" style={{margin: "4px 0 0 0"}}>
                        "{item.card.example.trim()}"
                      </p>
                    </div>
                  )}
                </div>
                <strong>{item.correct ? "✓ Đúng" : "✕ Sai"}</strong>
              </article>
            ))}
          </div>

          <div className="completion-actions">
            {result.wrongAnswers > 0 && (
              <button
                className="button-primary"
                style={{backgroundColor: "#ea580c", borderColor: "#ea580c"}}
                onClick={handleRetryIncorrect}
              >
                🔄 Làm lại câu sai ({result.wrongAnswers} câu)
              </button>
            )}
            <button className="button-secondary" onClick={handleRestartAll}>
              🔁 Làm lại toàn bộ bài
            </button>
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
            <button
              className="button-small button-outline"
              onClick={() => {
                if (assignmentId && classId) {
                  navigate(`/classes/${classId}`);
                } else {
                  navigate(`/study-sets/${setId}`);
                }
              }}
            >
              ← {assignmentId && classId ? "Quay lại lớp học" : "Quay lại bộ học"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-page">
      <div className="test-top-bar">
        <Link
          className="back-link"
          to={assignmentId && classId ? `/classes/${classId}` : `/study-sets/${setId}`}
        >
          ← {assignmentId && classId ? "Quay lại lớp học" : "Quay lại bộ học"}
        </Link>
        <div className="test-title-block">
          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <span className="eyebrow">KIỂM TRA</span>
            {isRetrySession && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#c2410c",
                  backgroundColor: "#fff7ed",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid #fed7aa",
                }}
              >
                Làm lại câu sai
              </span>
            )}
          </div>
          <h1>{studySet?.title}</h1>
        </div>
        <div className="test-counter">
          Câu {currentQuestionIndex + 1} / {cards.length}
        </div>
      </div>

      <div className="test-progress-summary">
        <span>Đã trả lời: {answeredCount} / {cards.length}</span>
        <span>Còn lại: {unansweredCount}</span>
      </div>

      <div className="flashcards-progress-container">
        <div
          className="flashcards-progress-bar"
          style={{
            width: `${Math.round(
              ((currentQuestionIndex + 1) / cards.length) * 100,
            )}%`,
          }}
        />
      </div>

      <section className="test-card">
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span className="card-face-tag">TỪ CẦN KIỂM TRA</span>
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
        <h2>{currentCard.term}</h2>
        {Boolean(currentCard.pronunciation && currentCard.pronunciation.trim()) && (
          <span className="card-pronunciation">{currentCard.pronunciation.trim()}</span>
        )}
        <p className="test-question">Nghĩa của từ này là gì?</p>
        <label className="test-answer-label">
          <span>Câu trả lời của bạn</span>
          <input
            value={currentAnswer}
            onChange={(event) => handleAnswerChange(event.target.value)}
            placeholder="Nhập câu trả lời..."
            disabled={submitting}
          />
        </label>

        {submitError && (
          <div className="form-error test-submit-error">{submitError}</div>
        )}

        {showConfirmSubmit && (
          <div className="test-confirm-box">
            <strong>Bạn còn {unansweredCount} câu chưa trả lời.</strong>
            <span>Bạn có chắc muốn nộp bài?</span>
            <div>
              <button
                className="button-small button-outline"
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
              >
                Hủy
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={submitTest}
                disabled={submitting}
              >
                {submitting ? "Đang nộp bài..." : "Vẫn nộp"}
              </button>
            </div>
          </div>
        )}

        <div className="test-actions">
          <button
            className="control-btn"
            type="button"
            onClick={() => moveToQuestion(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0 || submitting}
          >
            Câu trước
          </button>
          {currentQuestionIndex < cards.length - 1 ? (
            <button
              className="control-btn next-btn"
              type="button"
              onClick={() => moveToQuestion(currentQuestionIndex + 1)}
              disabled={submitting}
            >
              Câu tiếp theo
            </button>
          ) : (
            <button
              className="button-primary"
              type="button"
              onClick={handleSubmitClick}
              disabled={submitting}
            >
              {submitting ? "Đang nộp bài..." : "Nộp bài"}
            </button>
          )}
        </div>
      </section>

      <div className="test-question-nav">
        {cards.map((card, index) => (
          <button
            key={card.card_id}
            className={`test-question-chip ${
              index === currentQuestionIndex ? "active" : ""
            } ${answers[index]?.trim() ? "answered" : ""}`}
            type="button"
            onClick={() => moveToQuestion(index)}
            disabled={submitting}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
