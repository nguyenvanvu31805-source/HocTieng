import {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";

const MAX_MATCH_PAIRS = 8;

const shuffleItems = (items) =>
  [...items]
    .map((item) => ({item, sort: Math.random()}))
    .sort((a, b) => a.sort - b.sort)
    .map(({item}) => item);

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
};

export default function MatchPage() {
  const {setId} = useParams();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState(null);
  const [sourceCards, setSourceCards] = useState([]);
  const [termCards, setTermCards] = useState([]);
  const [definitionCards, setDefinitionCards] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [matchedCards, setMatchedCards] = useState([]);
  const [wrongPair, setWrongPair] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [state, setState] = useState({
    loading: true,
    error: "",
    notFound: false,
  });

  const matchedSet = useMemo(() => new Set(matchedCards), [matchedCards]);
  const totalPairs = sourceCards.length;
  const isPlaying =
    gameStarted && !gameFinished && !state.loading && !state.error && totalPairs > 0;

  const startGame = useCallback((cards) => {
    const nextCards = cards.slice(0, MAX_MATCH_PAIRS);
    setSourceCards(nextCards);
    setTermCards(shuffleItems(nextCards));
    setDefinitionCards(shuffleItems(nextCards));
    setSelectedTerm(null);
    setSelectedDefinition(null);
    setMatchedCards([]);
    setWrongPair(null);
    setElapsedSeconds(0);
    setGameFinished(false);
    setGameStarted(nextCards.length > 0);
  }, []);

  const fetchData = useCallback(async () => {
    setState({loading: true, error: "", notFound: false});
    setStudySet(null);
    startGame([]);

    try {
      const setResponse = await api.get(`/study-sets/${setId}`);
      setStudySet(setResponse.data.data);

      const cardsResponse = await api.get(`/study-sets/${setId}/cards`);
      const cards = (cardsResponse.data.data || []).filter(
        (card) => card.term && card.definition,
      );
      startGame(cards);
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
          error: getErrorMessage(error) || "Không thể tải dữ liệu.",
          notFound: false,
        });
      }
    }
  }, [setId, startGame]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!wrongPair) return undefined;

    const timeout = window.setTimeout(() => {
      setWrongPair(null);
      setSelectedTerm(null);
      setSelectedDefinition(null);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [wrongPair]);

  const tryMatch = (termCard, definitionCard) => {
    if (!termCard || !definitionCard) return;

    if (termCard.card_id === definitionCard.card_id) {
      const nextMatchedCount = matchedSet.has(termCard.card_id)
        ? matchedCards.length
        : matchedCards.length + 1;
      setMatchedCards((current) =>
        current.includes(termCard.card_id)
          ? current
          : [...current, termCard.card_id],
      );
      setSelectedTerm(null);
      setSelectedDefinition(null);
      setWrongPair(null);
      if (nextMatchedCount === totalPairs) {
        setGameFinished(true);
        setGameStarted(false);
      }
      return;
    }

    setWrongPair({
      termId: termCard.card_id,
      definitionId: definitionCard.card_id,
    });
  };

  const handleSelectTerm = (card) => {
    if (matchedSet.has(card.card_id) || wrongPair) return;

    setSelectedTerm(card);
    if (selectedDefinition) {
      tryMatch(card, selectedDefinition);
    }
  };

  const handleSelectDefinition = (card) => {
    if (matchedSet.has(card.card_id) || wrongPair) return;

    setSelectedDefinition(card);
    if (selectedTerm) {
      tryMatch(selectedTerm, card);
    }
  };

  const handleRestart = () => {
    startGame(sourceCards);
  };

  const getTermClassName = (card) => {
    const classes = ["match-card"];
    if (selectedTerm?.card_id === card.card_id) classes.push("selected");
    if (matchedSet.has(card.card_id)) classes.push("matched");
    if (wrongPair?.termId === card.card_id) classes.push("wrong");
    return classes.join(" ");
  };

  const getDefinitionClassName = (card) => {
    const classes = ["match-card"];
    if (selectedDefinition?.card_id === card.card_id) classes.push("selected");
    if (matchedSet.has(card.card_id)) classes.push("matched");
    if (wrongPair?.definitionId === card.card_id) classes.push("wrong");
    return classes.join(" ");
  };

  if (state.loading) {
    return (
      <div className="match-page">
        <div className="empty-panel">Đang tải Ghép thẻ...</div>
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div className="match-page">
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
      <div className="match-page">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="form-error">Lỗi: {state.error}</div>
        <div className="match-error-actions">
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

  if (!totalPairs) {
    return (
      <div className="match-page">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="empty-panel">
          <h2>Bộ học chưa có thẻ để chơi.</h2>
          <p className="muted">Vui lòng thêm thẻ có thuật ngữ và định nghĩa.</p>
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

  if (gameFinished) {
    return (
      <div className="match-page">
        <div className="completion-card">
          <div className="completion-icon">Hoàn thành</div>
          <h2>Bạn đã ghép đúng tất cả các cặp.</h2>
          <p className="completion-subtitle">
            Bộ học: <strong>{studySet?.title}</strong>
          </p>
          <div className="learn-result-grid">
            <div className="stat-box">
              <span className="stat-number">{totalPairs}</span>
              <span className="stat-label">Số cặp</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{formatTime(elapsedSeconds)}</span>
              <span className="stat-label">Thời gian</span>
            </div>
          </div>
          <div className="completion-actions">
            <button className="button-primary" onClick={handleRestart}>
              Chơi lại
            </button>
            <button
              className="button-small button-secondary"
              onClick={() => navigate(`/study-sets/${setId}`)}
            >
              ← Quay lại bộ thẻ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="match-page">
      <div className="match-top-bar">
        <Link className="back-link" to={`/study-sets/${setId}`}>
          ← Quay lại bộ học
        </Link>
        <div className="match-title-block">
          <span className="eyebrow">GHÉP THẺ</span>
          <h1>{studySet?.title}</h1>
        </div>
        <div className="match-timer">Thời gian {formatTime(elapsedSeconds)}</div>
      </div>

      <div className="match-summary">
        <span>
          Ghép đúng: {matchedCards.length} / {totalPairs}
        </span>
        <span>{wrongPair ? "Chưa đúng, thử lại!" : "Chọn một cặp tương ứng"}</span>
      </div>

      <div className="flashcards-progress-container">
        <div
          className="flashcards-progress-bar"
          style={{width: `${Math.round((matchedCards.length / totalPairs) * 100)}%`}}
        />
      </div>

      <div className="match-board">
        <section className="match-column">
          <h2>Thuật ngữ</h2>
          <p>Chọn một thuật ngữ</p>
          <div className="match-card-list">
            {termCards.map((card) => (
              <button
                className={getTermClassName(card)}
                disabled={matchedSet.has(card.card_id)}
                key={`term-${card.card_id}`}
                onClick={() => handleSelectTerm(card)}
                type="button"
              >
                {card.term}
              </button>
            ))}
          </div>
        </section>

        <section className="match-column">
          <h2>Định nghĩa</h2>
          <p>Chọn định nghĩa tương ứng</p>
          <div className="match-card-list">
            {definitionCards.map((card) => (
              <button
                className={getDefinitionClassName(card)}
                disabled={matchedSet.has(card.card_id)}
                key={`definition-${card.card_id}`}
                onClick={() => handleSelectDefinition(card)}
                type="button"
              >
                {card.definition}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
