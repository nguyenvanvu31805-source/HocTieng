import {useEffect, useState, useCallback} from "react";
import {Link, useNavigate} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";
import StudySetCard from "../components/StudySetCard";

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "English",
  language: "English",
  visibility: "PRIVATE",
};

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("bookmarks"); // 'bookmarks' | 'my'
  const [bookmarks, setBookmarks] = useState([]);
  const [mySets, setMySets] = useState([]);
  const [state, setState] = useState({loading: true, error: ""});

  // Modal Create Study Set
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal Edit Study Set
  const [editingSet, setEditingSet] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchLibraryData = useCallback(() => {
    setState({loading: true, error: ""});

    Promise.all([
      api.get("/bookmarks").catch((err) => {
        console.warn("Could not load bookmarks:", err);
        return {data: {data: []}};
      }),
      api.get("/study-sets/my").catch((err) => {
        console.warn("Could not load my study sets:", err);
        return {data: {data: []}};
      }),
    ])
      .then(([bookmarksRes, mySetsRes]) => {
        setBookmarks(bookmarksRes.data.data || []);
        setMySets(mySetsRes.data.data || []);
        setState({loading: false, error: ""});
      })
      .catch((error) => {
        setState({
          loading: false,
          error: getErrorMessage(error) || "Không thể tải thư viện.",
        });
      });
  }, []);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  const handleOpenCreateModal = () => {
    setCreateForm(INITIAL_FORM);
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError("Vui lòng nhập tên bộ học.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    try {
      const {data} = await api.post("/study-sets", {
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        category: createForm.category.trim() || "English",
        language: createForm.language,
        visibility: createForm.visibility,
      });

      setShowCreateModal(false);
      const newSet = data?.data;
      if (newSet?.set_id) {
        navigate(`/study-sets/${newSet.set_id}`);
      } else {
        fetchLibraryData();
      }
    } catch (err) {
      setCreateError(getErrorMessage(err) || "Không thể tạo bộ học.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditModal = (studySet) => {
    setEditingSet(studySet);
    setEditForm({
      title: studySet.title || "",
      description: studySet.description || "",
      category: studySet.category || "English",
      language: studySet.language || "English",
      visibility: studySet.visibility || "PRIVATE",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      setEditError("Vui lòng nhập tên bộ học.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      await api.patch(`/study-sets/${editingSet.set_id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category.trim() || "English",
        language: editForm.language,
        visibility: editForm.visibility,
      });

      setEditingSet(null);
      fetchLibraryData();
    } catch (err) {
      setEditError(getErrorMessage(err) || "Không thể cập nhật bộ học.");
    } finally {
      setEditLoading(false);
    }
  };

  const currentList = activeTab === "bookmarks" ? bookmarks : mySets;

  return (
    <div className="library-page">
      <div className="library-page-heading">
        <div>
          <p className="eyebrow">KHÔNG GIAN CÁ NHÂN</p>
          <h1>Thư viện của tôi</h1>
          <p className="muted">
            Quản lý các bộ học bạn đã lưu và bộ học do chính bạn tạo ra.
          </p>
        </div>
        <div style={{display: "flex", gap: "14px", alignItems: "center"}}>
          <button
            className="button-primary create-set-btn"
            onClick={handleOpenCreateModal}
            style={{cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px"}}
          >
            <span>+</span> Tạo bộ học
          </button>
          <Link className="back-link" to="/">
            ← Về trang chủ
          </Link>
        </div>
      </div>

      <div className="library-tabs">
        <button
          className={`library-tab-btn ${activeTab === "bookmarks" ? "active" : ""}`}
          onClick={() => setActiveTab("bookmarks")}
        >
          ★ Bộ học đã lưu ({bookmarks.length})
        </button>
        <button
          className={`library-tab-btn ${activeTab === "my" ? "active" : ""}`}
          onClick={() => setActiveTab("my")}
        >
          📁 Bộ học của tôi ({mySets.length})
        </button>
      </div>

      {state.loading ? (
        <div className="empty-panel">Đang tải thư viện...</div>
      ) : state.error ? (
        <div className="form-error">
          <p>Lỗi: {state.error}</p>
          <button
            className="button-small button-outline"
            style={{marginTop: "12px"}}
            onClick={fetchLibraryData}
          >
            Thử lại
          </button>
        </div>
      ) : currentList.length === 0 ? (
        <div className="empty-panel">
          {activeTab === "bookmarks" ? (
            <>
              <h3>Bạn chưa lưu bộ học nào.</h3>
              <p className="muted" style={{marginTop: "8px"}}>
                Hãy khám phá các bộ học và lưu những bộ bạn muốn học sau.
              </p>
              <Link
                to="/explore"
                className="button-primary"
                style={{marginTop: "20px", display: "inline-block"}}
              >
                Khám phá bộ học →
              </Link>
            </>
          ) : (
            <>
              <h3>Bạn chưa tạo bộ học nào.</h3>
              <p className="muted" style={{marginTop: "8px"}}>
                Tạo bộ học riêng để bắt đầu ghi nhớ từ vựng tiếng Anh.
              </p>
              <button
                className="button-primary"
                style={{marginTop: "20px", cursor: "pointer"}}
                onClick={handleOpenCreateModal}
              >
                + Tạo bộ học ngay
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="study-set-grid">
          {currentList.map((studySet) => (
            <StudySetCard
              key={studySet.set_id}
              studySet={studySet}
              showActions={activeTab === "my"}
              onEdit={activeTab === "my" ? handleOpenEditModal : null}
            />
          ))}
        </div>
      )}

      {/* CREATE STUDY SET MODAL */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => !createLoading && setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo bộ học</h2>
              <button
                className="modal-close-btn"
                onClick={() => !createLoading && setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Tên bộ học *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Từ vựng tiếng Anh cơ bản"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({...createForm, title: e.target.value})
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
                  placeholder="Ví dụ: Các từ vựng tiếng Anh mình tự học"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({...createForm, description: e.target.value})
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
                  placeholder="Ví dụ: English, Giao tiếp, IELTS..."
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm({...createForm, category: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Ngôn ngữ
                </label>
                <select
                  value={createForm.language}
                  onChange={(e) =>
                    setCreateForm({...createForm, language: e.target.value})
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
                      name="create-visibility"
                      value="PUBLIC"
                      checked={createForm.visibility === "PUBLIC"}
                      onChange={() =>
                        setCreateForm({...createForm, visibility: "PUBLIC"})
                      }
                    />
                    <span>🌐 Công khai (Mọi người có thể xem và học)</span>
                  </label>
                  <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px"}}>
                    <input
                      type="radio"
                      name="create-visibility"
                      value="PRIVATE"
                      checked={createForm.visibility === "PRIVATE"}
                      onChange={() =>
                        setCreateForm({...createForm, visibility: "PRIVATE"})
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
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-small button-primary"
                  disabled={createLoading}
                >
                  {createLoading ? "Đang tạo..." : "Tạo bộ học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDY SET MODAL */}
      {editingSet && (
        <div
          className="modal-overlay"
          onClick={() => !editLoading && setEditingSet(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chỉnh sửa bộ học</h2>
              <button
                className="modal-close-btn"
                onClick={() => !editLoading && setEditingSet(null)}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="form-error" style={{marginBottom: "16px"}}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Tên bộ học *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({...editForm, title: e.target.value})
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
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({...editForm, description: e.target.value})
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
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({...editForm, category: e.target.value})
                  }
                  style={{width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)"}}
                />
              </div>

              <div className="form-group" style={{marginBottom: "16px"}}>
                <label style={{display: "block", marginBottom: "6px", fontWeight: "700", fontSize: "12px"}}>
                  Ngôn ngữ
                </label>
                <select
                  value={editForm.language}
                  onChange={(e) =>
                    setEditForm({...editForm, language: e.target.value})
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
                      name="edit-visibility"
                      value="PUBLIC"
                      checked={editForm.visibility === "PUBLIC"}
                      onChange={() =>
                        setEditForm({...editForm, visibility: "PUBLIC"})
                      }
                    />
                    <span>🌐 Công khai (Mọi người có thể xem và học)</span>
                  </label>
                  <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px"}}>
                    <input
                      type="radio"
                      name="edit-visibility"
                      value="PRIVATE"
                      checked={editForm.visibility === "PRIVATE"}
                      onChange={() =>
                        setEditForm({...editForm, visibility: "PRIVATE"})
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
                  onClick={() => setEditingSet(null)}
                  disabled={editLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button-small button-primary"
                  disabled={editLoading}
                >
                  {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
