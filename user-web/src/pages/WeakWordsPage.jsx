import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getWeakCards } from "../services/progressService";
import { getErrorMessage } from "../utils/errors";

export default function WeakWordsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilter = searchParams.get("filter") || "all";
  const currentPage = Number(searchParams.get("page")) || 1;

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, total_pages: 1 });
  const [totalWeakCards, setTotalWeakCards] = useState(0);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getWeakCards({
        filter: currentFilter,
        page: currentPage,
        limit: 15,
      });

      if (res?.data) {
        setItems(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, total_pages: 1 });
        setTotalWeakCards(res.data.summary?.total_weak_cards || 0);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Không thể tải danh sách từ yếu.");
    } finally {
      setLoading(false);
    }
  }, [currentFilter, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (newFilter) => {
    setSearchParams({ filter: newFilter, page: "1" });
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ filter: currentFilter, page: String(newPage) });
  };

  return (
    <div className="weak-words-page">
      {/* Header Banner */}
      <div className="weak-words-header">
        <div>
          <span className="eyebrow" style={{ color: "#ea580c" }}>
            TRUNG TÂM TỪ YẾU
          </span>
          <h1>⚠️ Từ vựng cần ôn lại</h1>
          <p className="muted">
            {totalWeakCards > 0 ? (
              <>
                Bạn đang có <strong style={{ color: "#ea580c" }}>{totalWeakCards}</strong> từ cần
                củng cố để ghi nhớ lâu dài.
              </>
            ) : (
              "Hệ thống tự động phát hiện các từ bạn thường trả lời sai hoặc có mức độ thông thạo thấp."
            )}
          </p>
        </div>

        {totalWeakCards > 0 && (
          <div className="weak-words-header-actions">
            <button
              className="button-primary btn-review-all-weak"
              onClick={() => navigate("/review/weak")}
            >
              ⚡ Học lại ngay ({totalWeakCards} từ)
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="weak-filter-bar">
        <div className="weak-filter-tabs">
          <button
            className={`weak-tab ${currentFilter === "all" ? "active" : ""}`}
            onClick={() => handleFilterChange("all")}
          >
            Tất cả từ yếu
          </button>
          <button
            className={`weak-tab ${currentFilter === "most_wrong" ? "active" : ""}`}
            onClick={() => handleFilterChange("most_wrong")}
          >
            Sai nhiều nhất
          </button>
          <button
            className={`weak-tab ${currentFilter === "low_mastery" ? "active" : ""}`}
            onClick={() => handleFilterChange("low_mastery")}
          >
            Mastery thấp
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="empty-panel">Đang tải danh sách từ yếu...</div>
      ) : error ? (
        <div className="empty-panel">
          <p className="form-error">Lỗi: {error}</p>
          <button className="button-primary" style={{ marginTop: "12px" }} onClick={fetchData}>
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-panel weak-empty-panel">
          <span style={{ fontSize: "52px", display: "block", marginBottom: "12px" }}>🎉</span>
          <h2>Tuyệt vời! Hiện tại bạn không có từ yếu cần ôn.</h2>
          <p className="muted" style={{ margin: "10px 0 20px" }}>
            Tất cả các từ bạn đã học đều đang có tiến độ tốt. Hãy tiếp tục học thêm từ mới nhé!
          </p>
          <Link className="button-primary" to="/explore">
            📚 Khám phá bộ học
          </Link>
        </div>
      ) : (
        <>
          <div className="weak-card-grid">
            {items.map((item) => (
              <div className="weak-card-item" key={item.card_id}>
                <div className="weak-card-top">
                  <span className="weak-card-set">📁 {item.set_title}</span>
                  {Boolean(item.audio_url && item.audio_url.trim()) && (
                    <button
                      type="button"
                      className="audio-btn"
                      onClick={(e) => playAudio(e, item.audio_url, item.term)}
                      title="Phát âm"
                    >
                      🔊
                    </button>
                  )}
                </div>

                <div className="weak-card-main">
                  <h3>{item.term}</h3>
                  {Boolean(item.pronunciation && item.pronunciation.trim()) && (
                    <span className="card-pronunciation">{item.pronunciation.trim()}</span>
                  )}
                  <p className="weak-card-def">{item.definition}</p>

                  {Boolean(item.example && item.example.trim()) && (
                    <div className="card-example-box" style={{ marginTop: "8px" }}>
                      <span className="example-label" style={{ color: "#ea580c" }}>
                        💬 Ví dụ:
                      </span>
                      <p className="card-example" style={{ margin: "4px 0 0 0" }}>
                        "{item.example.trim()}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="weak-card-bottom">
                  <div className="weak-card-stats">
                    <span className="stat-badge wrong">❌ {item.wrong_count} sai</span>
                    <span className="stat-badge correct">✅ {item.correct_count} đúng</span>
                    <span className="stat-badge mastery">Mastery: {item.mastery_level}/3</span>
                  </div>

                  <button
                    className="button-small button-outline btn-study-this"
                    onClick={() => navigate(`/review/weak?cardId=${item.card_id}`)}
                  >
                    ⚡ Học ngay
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="weak-pagination">
              <button
                className="button-small button-outline"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                ← Trang trước
              </button>

              <span className="pagination-info">
                Trang <strong>{currentPage}</strong> / {pagination.total_pages}
              </span>

              <button
                className="button-small button-outline"
                disabled={currentPage >= pagination.total_pages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Trang sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
