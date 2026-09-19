import {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import api from "../services/api";
import {getErrorMessage} from "../utils/errors";

const blankCard = {
  term: "",
  definition: "",
  pronunciation: "",
  example: "",
  image_url: "",
  audio_url: "",
  position: "",
};

export default function CardsPage() {
  const [searchParams] = useSearchParams();
  const [setId, setSetId] = useState(searchParams.get("setId") || "");
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState(blankCard);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const routeSetId = searchParams.get("setId");
    if (!routeSetId || !/^\d+$/.test(routeSetId) || Number(routeSetId) < 1)
      return;
    setLoading(true);
    api
      .get(`/study-sets/${routeSetId}/cards`)
      .then(({data}) => setCards(data.data || []))
      .catch((requestError) => {
        setError(getErrorMessage(requestError));
        setCards([]);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const loadCards = async (event) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d+$/.test(setId) || Number(setId) < 1) {
      setError("Study Set ID phải là số nguyên dương.");
      return;
    }
    setLoading(true);
    try {
      const {data} = await api.get(`/study-sets/${setId}/cards`);
      setCards(data.data || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const editCard = (card) => {
    setEditingId(card.card_id);
    setForm({
      ...card,
      image_url: card.image_url || "",
      audio_url: card.audio_url || "",
      position: card.position ?? "",
    });
    setNotice("");
  };
  const resetForm = () => {
    setEditingId(null);
    setForm(blankCard);
  };
  const updateField = (event) =>
    setForm({...form, [event.target.name]: event.target.value});

  const saveCard = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.term || !form.definition) {
      setError("Từ vựng và định nghĩa là bắt buộc.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      ...(form.position === "" ? {} : {position: Number(form.position)}),
    };
    try {
      const response = editingId
        ? await api.put(`/cards/${editingId}`, payload)
        : await api.post(`/study-sets/${setId}/cards`, payload);
      const saved = response.data.data;
      setCards((current) =>
        editingId
          ? current.map((card) => (card.card_id === editingId ? saved : card))
          : [...current, saved],
      );
      setNotice(editingId ? "Card đã được cập nhật." : "Card đã được tạo.");
      resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deleteCard = async (cardId) => {
    if (!window.confirm("Bạn có chắc muốn xóa card này?")) return;
    setError("");
    try {
      await api.delete(`/cards/${cardId}`);
      setCards((current) => current.filter((card) => card.card_id !== cardId));
      setNotice("Card đã được xóa.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">NỘI DUNG / THẺ TỪ VỰNG</span>
          <h1>Thẻ từ vựng</h1>
          <p className="muted">Chỉnh sửa từ vựng trong một bộ học cụ thể.</p>
        </div>
      </div>
      <section className="toolbar-panel">
        <form className="set-picker" onSubmit={loadCards}>
          <label>
            ID bộ học
            <input
              value={setId}
              onChange={(event) => setSetId(event.target.value)}
              placeholder="Ví dụ: 1"
              inputMode="numeric"
            />
          </label>
          <button className="primary-button" disabled={loading}>
            {loading ? "Đang tải..." : "Tải danh sách thẻ →"}
          </button>
        </form>
        <span className="toolbar-hint">
          Nhập trực tiếp ID bộ học để tải danh sách thẻ.
        </span>
      </section>
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}
      <section className="cards-workspace">
        <div className="table-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">BỘ HỌC {setId || "—"}</span>
              <h2>{cards.length} thẻ đã tải</h2>
            </div>
          </div>
          {cards.length === 0 ? (
            <div className="table-empty">
              <span>◌</span>
              <p>Chưa có thẻ để hiển thị.</p>
              <small>Nhập ID bộ học công khai và bấm Tải danh sách thẻ.</small>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Vị trí</th>
                    <th>Từ vựng</th>
                    <th>Định nghĩa</th>
                    <th>Ví dụ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr key={card.card_id}>
                      <td className="position-cell">{card.position ?? "—"}</td>
                      <td>
                        <b>{card.term}</b>
                        <small>{card.pronunciation || "Chưa có phát âm"}</small>
                      </td>
                      <td>{card.definition}</td>
                      <td className="example-cell">{card.example || "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="ghost-button"
                            onClick={() => editCard(card)}
                          >
                            Sửa
                          </button>
                          <button
                            className="danger-button"
                            onClick={() => deleteCard(card.card_id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <form className="editor-panel" onSubmit={saveCard}>
          <div className="panel-header">
            <div>
              <span className="panel-kicker">BIÊN TẬP</span>
              <h2>{editingId ? "Sửa thẻ" : "Thẻ mới"}</h2>
            </div>
            {editingId && (
              <button
                type="button"
                className="close-button"
                onClick={resetForm}
              >
                ×
              </button>
            )}
          </div>
          <label>
            Từ vựng *
            <input
              name="term"
              value={form.term}
              onChange={updateField}
              required
              placeholder="Nhập từ vựng"
            />
          </label>
          <label>
            Định nghĩa *
            <textarea
              name="definition"
              value={form.definition}
              onChange={updateField}
              required
              placeholder="Nhập định nghĩa"
            />
          </label>
          <label>
            Phát âm
            <input
              name="pronunciation"
              value={form.pronunciation}
              onChange={updateField}
              placeholder="/fəˈnɛtɪk/"
            />
          </label>
          <label>
            Ví dụ
            <textarea
              name="example"
              value={form.example}
              onChange={updateField}
              placeholder="Nhập câu ví dụ"
            />
          </label>
          <div className="form-row">
            <label>
              Vị trí
              <input
                name="position"
                type="number"
                min="1"
                value={form.position}
                onChange={updateField}
              />
            </label>
            <label>
              Đường dẫn hình ảnh
              <input
                name="image_url"
                value={form.image_url}
                onChange={updateField}
                placeholder="https://..."
              />
            </label>
          </div>
          <label>
            Đường dẫn âm thanh
            <input
              name="audio_url"
              value={form.audio_url}
              onChange={updateField}
              placeholder="https://..."
            />
          </label>
          <button className="primary-button full" disabled={saving || !setId}>
            {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo thẻ"}
          </button>
        </form>
      </section>
    </div>
  );
}
