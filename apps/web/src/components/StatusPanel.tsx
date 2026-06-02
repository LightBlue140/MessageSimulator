export function StatusPanel({ running }: { running: boolean }) {
  return (
    <section aria-label="运行状态">
      <strong>状态：</strong>
      {running ? "运行中" : "已停止"}
    </section>
  );
}
