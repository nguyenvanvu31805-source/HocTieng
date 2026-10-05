import {useEffect, useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import api from "../services/api";
import {useAuth} from "../context/useAuth";
import {getStudyStats} from "../services/studySessionService";
import {getErrorMessage} from "../utils/errors";
import StudySetCard from "../components/StudySetCard";

export default function HomePage({explore = false}) {
  const navigate = useNavigate();
  const {user} = useAuth();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [studySets, setStudySets] = useState([]);
  const [studyStats, setStudyStats] = useState(null);
  const [state, setState] = useState({loading: true, error: ""});

  useEffect(() => {
    if (user) {
      getStudyStats().then(setStudyStats).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const search = searchParams.get("q") || "";
    setQuery(search);
    setState({loading: true, error: ""});
    api
      .get("/study-sets", {params: search ? {search} : {}})
      .then(({data}) => setStudySets(data.data || []))
      .catch((error) =>
        setState({loading: false, error: getErrorMessage(error)}),
      )
      .finally(() => setState((current) => ({...current, loading: false})));
  }, [searchParams]);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/explore?q=${encodeURIComponent(value)}` : "/explore");
  };

  return (
    <div className="page-shell">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot">🌱</span>
            <span>NỀN TẢNG HỌC TỪ VỰNG HIỆN ĐẠI</span>
          </div>
          <h1 className="hero-title">
            Learn smarter.<br />
            <em className="hero-highlight">Grow every day.</em>
          </h1>
          <p className="hero-lede">
            Nắm vững từ vựng tiếng Anh qua flashcards, luyện tập chủ động, kiểm tra và theo dõi tiến độ thực tế mỗi ngày.
          </p>

          <form className="search-box" onSubmit={submitSearch}>
            <span className="search-icon">🔍</span>
            <input
              name="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm bộ học từ vựng (ví dụ: Family, Food, Jobs...)"
            />
            <button type="submit" className="button-search">
              Tìm kiếm
            </button>
          </form>

          <div className="hero-cta-row">
            {user ? (
              <>
                <Link to="/library" className="button-primary button-lime">
                  Vào thư viện học tập →
                </Link>
                <Link to="/explore" className="button-secondary">
                  Khám phá bộ học
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="button-primary button-lime">
                  Bắt đầu học ngay →
                </Link>
                <Link to="/explore" className="button-secondary">
                  Khám phá miễn phí
                </Link>
              </>
            )}
          </div>
        </div>

        {/* HERO RIGHT VISUAL */}
        <div className="hero-art">
          <div className="eco-visual-card eco-card-accent">
            <div className="eco-card-header">
              <span className="eco-card-pill">CHỦ ĐỀ ĐỜI SỐNG</span>
              <span className="eco-card-badge">✨ Flashcard</span>
            </div>
            <div className="eco-card-body">
              <span className="eco-card-phonetic">/kəmˈprɛhɛnd/</span>
              <h3 className="eco-card-word">comprehend</h3>
              <p className="eco-card-meaning">hiểu sâu sắc và bao quát</p>
            </div>
            <div className="eco-card-footer">
              <span>🃏 15 thẻ từ vựng</span>
              <span className="eco-chip-success">✓ Đã ôn tập</span>
            </div>
          </div>

          <div className="eco-visual-card eco-card-back">
            <div className="eco-card-header">
              <span className="eco-card-pill">TIẾN ĐỘ THỰC TẾ</span>
              <span className="eco-card-badge">🎯 Spaced Repetition</span>
            </div>
            <div className="eco-card-body">
              <h4 className="eco-card-word">resilient</h4>
              <p className="eco-card-meaning">kiên cường, phục hồi nhanh</p>
            </div>
          </div>
        </div>
      </section>

      {/* STREAK & QUICK DASHBOARD BANNER FOR LOGGED-IN USERS */}
      {user && (
        <section className="user-dashboard-banner">
          <div className="dashboard-welcome-row">
            <div>
              <span className="eyebrow" style={{ color: "var(--color-muted)" }}>
                TRUNG TÂM HỌC TẬP CỦA BẠN
              </span>
              <h2 className="dashboard-welcome-heading">
                Xin chào, {user.full_name || user.username} 👋
              </h2>
              <p className="dashboard-welcome-sub">
                Duy trì nhịp học mỗi ngày để củng cố phản xạ từ vựng lâu dài.
              </p>
            </div>
            <div className="dashboard-quick-actions">
              <Link to="/my-learning" className="button-small button-outline">
                ⏱️ Lịch sử học
              </Link>
              <Link to="/weak-words" className="button-small button-warning-outline">
                ⚠️ Từ vựng cần ôn ({studyStats ? "xem ngay" : "kiểm tra"})
              </Link>
            </div>
          </div>

          {studyStats && (
            <div className="streak-grid">
              <div className="streak-grid-item">
                <span className="streak-icon">🔥</span>
                <div>
                  <span className="streak-val">{studyStats.current_streak} ngày</span>
                  <span className="streak-lbl">Chuỗi học liên tiếp</span>
                </div>
              </div>
              <div className="streak-grid-item">
                <span className="streak-icon">🏆</span>
                <div>
                  <span className="streak-val">{studyStats.longest_streak} ngày</span>
                  <span className="streak-lbl">Kỷ lục chuỗi</span>
                </div>
              </div>
              <div className="streak-grid-item">
                <span className="streak-icon">📚</span>
                <div>
                  <span className="streak-val">{studyStats.total_sessions} phiên</span>
                  <span className="streak-lbl">Tổng phiên hoàn thành</span>
                </div>
              </div>
              <div className="streak-grid-item">
                <span className="streak-icon">⏱️</span>
                <div>
                  <span className="streak-val">
                    {Math.floor((studyStats.total_duration_seconds || 0) / 60)} phút
                  </span>
                  <span className="streak-lbl">Thời gian đã học</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PUBLIC STUDY SETS LIBRARY */}
      <section className="library-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {explore ? "KHÁM PHÁ BỘ HỌC" : "THƯ VIỆN CHỦ ĐỀ"}
            </p>
            <h2 className="section-title">
              {explore
                ? query
                  ? `Kết quả tìm kiếm cho “${query}”`
                  : "Tất cả bộ học công khai"
                : "Bộ từ vựng nổi bật"}
            </h2>
          </div>
          <span className="result-count">
            {state.loading ? "Đang tải..." : `${studySets.length} bộ học`}
          </span>
        </div>

        {state.error && <div className="form-error">Lỗi: {state.error}</div>}

        {state.loading ? (
          <div className="study-set-grid">
            <div className="library-loading">
              <div className="loading-spinner-lime" />
              <span>Đang tải danh sách bộ từ vựng...</span>
            </div>
          </div>
        ) : studySets.length === 0 ? (
          <div className="empty-panel">
            <span className="empty-panel-icon">🌱</span>
            <h3>{query ? "Không tìm thấy bộ học phù hợp" : "Chưa có bộ học công khai nào"}</h3>
            <p>
              {query
                ? "Hãy thử tìm kiếm với từ khóa khác như Character, Family, Food..."
                : "Các bộ học mới sẽ xuất hiện tại đây khi được tạo công khai."}
            </p>
          </div>
        ) : (
          <div className="study-set-grid">
            {studySets.map((studySet) => (
              <StudySetCard key={studySet.set_id} studySet={studySet} />
            ))}
          </div>
        )}
      </section>

      {/* 3-STEP LEARNING METHOD */}
      <section className="section-band">
        <div className="section-band-header">
          <p className="eyebrow">PHƯƠNG PHÁP HỌC CHỦ ĐỘNG</p>
          <h2>Học có định hướng. Nhớ lâu hơn.</h2>
          <p className="section-band-sub">
            Kết hợp 4 chế độ Flashcards, Luyện tập, Kiểm tra và Ghép thẻ giúp kích hoạt trí nhớ từ vựng sâu.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-step-pill">01 · BẮT ĐẦU</span>
            <h3>Lật thẻ trực quan</h3>
            <p>Làm quen nghĩa, phiên âm và ví dụ thực tế qua thẻ lật hai mặt mượt mà.</p>
          </article>
          <article className="feature-card">
            <span className="feature-step-pill">02 · GHI NHỚ</span>
            <h3>Luyện tập phản xạ</h3>
            <p>Tự gõ đáp án và nhận phản hồi tức thì để chuyển từ vựng vào trí nhớ dài hạn.</p>
          </article>
          <article className="feature-card">
            <span className="feature-step-pill">03 · ĐÁNH GIÁ</span>
            <h3>Kiểm tra & Ghép thẻ</h3>
            <p>Thiết lập áp lực thời gian với trò chơi ghép thẻ và bài thi kiểm tra tính điểm.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
