export type LogLevel = "info" | "error";

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export class RecentLogs {
  private nextId = 1;
  private entries: LogEntry[] = [];

  constructor(private readonly limit = 100) {
    if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) {
      throw new Error("RecentLogs limit must be a positive integer");
    }
  }

  add(level: LogLevel, message: string) {
    this.entries.push({
      id: this.nextId++,
      level,
      message,
      timestamp: new Date().toISOString()
    });
    this.entries = this.entries.slice(-this.limit);
  }

  list() {
    return this.entries.map((entry) => ({ ...entry }));
  }
}
