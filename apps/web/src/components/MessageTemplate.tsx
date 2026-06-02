export function MessageTemplate({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section>
      <h2>消息模板</h2>
      <textarea
        aria-label="消息模板内容"
        rows={16}
        className="template-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
