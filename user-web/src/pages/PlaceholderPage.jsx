export default function PlaceholderPage({title, code}) {
  return (
    <div className="placeholder-page">
      <span className="todo-badge">TODO / {code}</span>
      <h1>{title}</h1>
      <p>
        Backend chưa có endpoint cho chức năng này. Màn hình sẽ được kết nối khi
        API tương ứng được xây dựng.
      </p>
    </div>
  );
}
