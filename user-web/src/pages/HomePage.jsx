import {useEffect, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";
import StudySetCard from "../components/StudySetCard";

export default function HomePage({explore = false}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [studySets, setStudySets] = useState([]);
  const [state, setState] = useState({loading: true, error: ""});

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
    const value = new FormData(event.currentTarget).get("query").trim();
    navigate(value ? `/explore?q=${encodeURIComponent(value)}` : "/explore");
  };

  return (
    <div className="page-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">MỘT CÁCH NHỎ ĐỂ HỌC LỚN</p>
          <h1>
            Mỗi từ vựng
            <br />
            <em>đều đáng nhớ.</em>
          </h1>
          <p className="hero-lede">
            Không gian thẻ từ tập trung giúp bạn xây dựng vốn tiếng Anh bằng sự
            lặp lại, tò mò và tiến bộ đều đặn.
          </p>
          <form className="search-box" onSubmit={submitSearch}>
            <span>⌕</span>
            <input
              name="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm bộ học..."
            />
            <button>Tìm kiếm →</button>
          </form>
          <div className="hero-note">
            <span className="hero-dot" />{" "}
            {explore
              ? "Khám phá bộ học tiếp theo của bạn"
              : "Bộ từ vựng tiếp theo đang chờ bạn"}
          </div>
        </div>
        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-card card-back">
            <small>ĐỊNH NGHĨA</small>
            <b>
              hiểu
              <br />
              sâu sắc
            </b>
          </div>
          <div className="floating-card card-front">
            <small>TỪ VỰNG / 01</small>
            <b>comprehend</b>
            <span>ˌkɒmprɪˈhɛnd</span>
          </div>
          <div className="art-caption">01 / LUYỆN TẬP HẰNG NGÀY</div>
        </div>
      </section>
      <section className="library-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {explore ? "KHÁM PHÁ" : "THƯ VIỆN CÔNG KHAI"}
            </p>
            <h2>
              {explore
                ? query
                  ? `Kết quả cho “${query}”`
                  : "Khám phá bộ học"
                : "Bộ học mới nhất"}
            </h2>
          </div>
          <span className="result-count">
            {state.loading ? "Đang tải..." : `${studySets.length} bộ học`}
          </span>
        </div>
        {state.error && <div className="form-error">Lỗi: {state.error}</div>}
        {state.loading ? (
          <div className="study-set-grid">
            <div className="library-loading">Đang tải bộ học...</div>
          </div>
        ) : studySets.length === 0 ? (
          <div className="empty-panel">
            {query
              ? "Không tìm thấy bộ học phù hợp."
              : "Chưa có bộ học công khai nào."}
          </div>
        ) : (
          <div className="study-set-grid">
            {studySets.map((studySet) => (
              <StudySetCard key={studySet.set_id} studySet={studySet} />
            ))}
          </div>
        )}
      </section>
      <section className="section-band">
        <div>
          <p className="eyebrow">BẮT ĐẦU TỪ ĐÂY</p>
          <h2>Học có chủ đích.</h2>
        </div>
        <div className="feature-grid">
          <article>
            <span>01</span>
            <h3>Tìm trọng tâm</h3>
            <p>Tìm theo chủ đề, ngôn ngữ hoặc điều bạn cần ghi nhớ.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Tạo vòng lặp</h3>
            <p>Lật, kiểm tra và ôn lại cho đến khi nhớ chủ động.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Giữ nhịp học</h3>
            <p>Mỗi phiên học ngắn đều là một bước tiến thật.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
