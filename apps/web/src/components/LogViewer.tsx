export interface UiLogEntry {
  id: number;
  level: "info" | "error";
  message: string;
  timestamp: string;
}

export function LogViewer({ logs }: { logs: UiLogEntry[] }) {
  return (
    <section>
      <h2>日志</h2>
      {logs.length === 0 ? (
        <p>暂无日志</p>
      ) : (
        <ul>
          {logs.map((log) => (
            <li key={log.id}>
              [{log.level}] {log.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
