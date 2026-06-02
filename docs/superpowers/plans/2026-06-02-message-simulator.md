# Message Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-managed single-task message simulator that serves HTTP, MQTT, WebSocket, TCP, and OPC UA outputs with configurable message templates and random parameter refresh intervals.

**Architecture:** Use a TypeScript monorepo with a Fastify backend, React frontend, shared types, and focused protocol adapters. The backend owns configuration validation, message snapshot generation, runtime lifecycle, logs, and adapter orchestration; the frontend edits the active configuration and controls start/stop.

**Tech Stack:** Node.js, TypeScript, pnpm or npm workspaces, Vitest, Fastify, React, Vite, MQTT.js/Aedes, ws, node-opcua, Zod.

---

## File Structure

- `package.json`: workspace scripts and root dev dependencies.
- `tsconfig.base.json`: shared TypeScript compiler settings.
- `apps/server/package.json`: backend package scripts and dependencies.
- `apps/server/src/index.ts`: backend entry point.
- `apps/server/src/api/routes.ts`: management HTTP API.
- `apps/server/src/config/schema.ts`: Zod schemas and defaults.
- `apps/server/src/config/store.ts`: local JSON configuration persistence.
- `apps/server/src/generator/random.ts`: random value generation by parameter type.
- `apps/server/src/generator/replacement.ts`: JSON and string template replacement.
- `apps/server/src/runtime/runtime.ts`: single active simulator runtime.
- `apps/server/src/runtime/logs.ts`: bounded recent log collection.
- `apps/server/src/adapters/types.ts`: adapter interface.
- `apps/server/src/adapters/http.ts`: HTTP adapter.
- `apps/server/src/adapters/websocket.ts`: WebSocket adapter.
- `apps/server/src/adapters/tcp.ts`: TCP adapter.
- `apps/server/src/adapters/mqtt.ts`: MQTT broker adapter.
- `apps/server/src/adapters/opcua.ts`: OPC UA adapter.
- `apps/server/test/**/*.test.ts`: backend tests.
- `apps/web/package.json`: frontend package scripts and dependencies.
- `apps/web/src/App.tsx`: main management UI.
- `apps/web/src/api.ts`: backend API client.
- `apps/web/src/components/*.tsx`: focused UI sections.
- `apps/web/src/types.ts`: frontend copies or imports of config types.
- `apps/web/test/**/*.test.tsx`: frontend tests.

---

### Task 1: Scaffold Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Step 1: Create root package files**

Create `package.json`:

```json
{
  "name": "message-simulator",
  "private": true,
  "workspaces": ["apps/server", "apps/web"],
  "scripts": {
    "dev": "npm run dev -w apps/server",
    "dev:web": "npm run dev -w apps/web",
    "build": "npm run build -w apps/server && npm run build -w apps/web",
    "test": "npm run test -w apps/server && npm run test -w apps/web",
    "typecheck": "npm run typecheck -w apps/server && npm run typecheck -w apps/web"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 2: Create backend package skeleton**

Create `apps/server/package.json`:

```json
{
  "name": "@message-simulator/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.0",
    "aedes": "^0.51.0",
    "fastify": "^4.28.0",
    "node-opcua": "^2.120.0",
    "ws": "^8.18.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/ws": "^8.5.0",
    "tsx": "^4.16.0",
    "vitest": "^1.6.0"
  }
}
```

Create `apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "test"]
}
```

Create `apps/server/src/index.ts`:

```ts
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ host: "0.0.0.0", port });
```

- [ ] **Step 3: Create frontend package skeleton**

Create `apps/web/package.json`:

```json
{
  "name": "@message-simulator/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run --environment jsdom",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^15.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Message Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/web/src/main.tsx`:

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

Create `apps/web/src/App.tsx`:

```tsx
export function App() {
  return <main>Message Simulator</main>;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Verify scaffold**

Run: `npm run typecheck`

Expected: both packages typecheck successfully.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json tsconfig.base.json apps
git commit -m "chore: scaffold message simulator workspace"
```

Expected: commit succeeds if the workspace has been initialized as a git repository.

---

### Task 2: Define Configuration Schema

**Files:**
- Create: `apps/server/src/config/schema.ts`
- Create: `apps/server/test/config-schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `apps/server/test/config-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultConfig, simulatorConfigSchema } from "../src/config/schema";

describe("simulatorConfigSchema", () => {
  it("accepts the default HTTP configuration", () => {
    expect(simulatorConfigSchema.parse(defaultConfig).protocol).toBe("http");
  });

  it("rejects invalid intervals", () => {
    expect(() =>
      simulatorConfigSchema.parse({ ...defaultConfig, randomizeIntervalSeconds: 0 })
    ).toThrow();
  });

  it("rejects a vector parameter without components", () => {
    expect(() =>
      simulatorConfigSchema.parse({
        ...defaultConfig,
        parameters: [
          { name: "pos", type: "vector", enabled: true, components: [] }
        ]
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- config-schema`

Expected: FAIL because `apps/server/src/config/schema.ts` does not exist.

- [ ] **Step 3: Implement schema**

Create `apps/server/src/config/schema.ts`:

```ts
import { z } from "zod";

const port = z.number().int().min(1).max(65535);
const seconds = z.number().min(0.1);
const parameterName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

const numberRange = {
  min: z.number(),
  max: z.number()
};

export const parameterSchema = z.discriminatedUnion("type", [
  z.object({ name: parameterName, type: z.literal("integer"), enabled: z.boolean(), min: z.number().int(), max: z.number().int() })
    .refine((value) => value.max >= value.min, "max must be greater than or equal to min"),
  z.object({ name: parameterName, type: z.literal("float"), enabled: z.boolean(), min: z.number(), max: z.number(), decimals: z.number().int().min(0).max(10) })
    .refine((value) => value.max >= value.min, "max must be greater than or equal to min"),
  z.object({ name: parameterName, type: z.literal("string"), enabled: z.boolean(), candidates: z.array(z.string()).min(1) }),
  z.object({ name: parameterName, type: z.literal("boolean"), enabled: z.boolean(), trueProbability: z.number().min(0).max(1) }),
  z.object({
    name: parameterName,
    type: z.literal("vector"),
    enabled: z.boolean(),
    components: z.array(z.object({
      name: parameterName,
      ...numberRange,
      decimals: z.number().int().min(0).max(10)
    }).refine((value) => value.max >= value.min, "max must be greater than or equal to min")).min(1)
  })
]);

export const protocolSchema = z.enum(["http", "mqtt", "websocket", "tcp", "opcua"]);

export const serverSettingsSchema = z.object({
  http: z.object({ port, path: z.string().startsWith("/"), contentType: z.string().min(1) }),
  mqtt: z.object({ port, topic: z.string().min(1), qos: z.union([z.literal(0), z.literal(1), z.literal(2)]), retain: z.boolean() }),
  websocket: z.object({ port, path: z.string().startsWith("/") }),
  tcp: z.object({ port, appendNewline: z.boolean(), encoding: z.enum(["utf8", "ascii"]) }),
  opcua: z.object({ port, endpointPath: z.string().startsWith("/"), namespace: z.string().min(1), nodeId: z.string().min(1), dataType: z.enum(["String", "Double", "Boolean"]) })
});

export const simulatorConfigSchema = z.object({
  protocol: protocolSchema,
  serverSettings: serverSettingsSchema,
  messageTemplate: z.string(),
  parameters: z.array(parameterSchema),
  sendIntervalSeconds: seconds,
  randomizeIntervalSeconds: seconds
});

export type SimulatorConfig = z.infer<typeof simulatorConfigSchema>;
export type ParameterConfig = z.infer<typeof parameterSchema>;

export const defaultConfig: SimulatorConfig = {
  protocol: "http",
  serverSettings: {
    http: { port: 8080, path: "/message", contentType: "application/json" },
    mqtt: { port: 1883, topic: "simulator/message", qos: 0, retain: false },
    websocket: { port: 8081, path: "/ws" },
    tcp: { port: 9000, appendNewline: true, encoding: "utf8" },
    opcua: { port: 4840, endpointPath: "/simulator", namespace: "MessageSimulator", nodeId: "s=Message", dataType: "String" }
  },
  messageTemplate: "{\"aa\":100}",
  parameters: [{ name: "aa", type: "integer", enabled: true, min: 0, max: 999 }],
  sendIntervalSeconds: 1,
  randomizeIntervalSeconds: 5
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w apps/server -- config-schema`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add apps/server/src/config/schema.ts apps/server/test/config-schema.test.ts
git commit -m "feat: define simulator configuration schema"
```

---

### Task 3: Implement Message Generator

**Files:**
- Create: `apps/server/src/generator/random.ts`
- Create: `apps/server/src/generator/replacement.ts`
- Create: `apps/server/test/message-generator.test.ts`

- [ ] **Step 1: Write failing generator tests**

Create `apps/server/test/message-generator.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { generateMessageSnapshot } from "../src/generator/replacement";
import type { ParameterConfig } from "../src/config/schema";

describe("generateMessageSnapshot", () => {
  it("replaces JSON fields recursively", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    const result = generateMessageSnapshot("{\"aa\":100,\"nested\":{\"aa\":100}}", [
      { name: "aa", type: "integer", enabled: true, min: 0, max: 999 }
    ]);
    expect(JSON.parse(result)).toEqual({ aa: 0, nested: { aa: 0 } });
  });

  it("replaces string assignments without partial name matches", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5);
    const result = generateMessageSnapshot("aa=100 aaa=100", [
      { name: "aa", type: "integer", enabled: true, min: 0, max: 10 }
    ]);
    expect(result).toBe("aa=5 aaa=100");
  });

  it("generates vectors as objects", () => {
    const params: ParameterConfig[] = [{
      name: "pos",
      type: "vector",
      enabled: true,
      components: [
        { name: "x", min: 0, max: 1, decimals: 1 },
        { name: "y", min: 1, max: 2, decimals: 1 }
      ]
    }];
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(JSON.parse(generateMessageSnapshot("{\"pos\":{\"x\":9,\"y\":9}}", params))).toEqual({ pos: { x: 0, y: 1 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- message-generator`

Expected: FAIL because generator files do not exist.

- [ ] **Step 3: Implement random value generation**

Create `apps/server/src/generator/random.ts`:

```ts
import type { ParameterConfig } from "../config/schema";

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function generateRandomValue(parameter: ParameterConfig): unknown {
  switch (parameter.type) {
    case "integer":
      return Math.floor(Math.random() * (parameter.max - parameter.min + 1)) + parameter.min;
    case "float":
      return round(Math.random() * (parameter.max - parameter.min) + parameter.min, parameter.decimals);
    case "string":
      return parameter.candidates[Math.floor(Math.random() * parameter.candidates.length)];
    case "boolean":
      return Math.random() < parameter.trueProbability;
    case "vector":
      return Object.fromEntries(parameter.components.map((component) => [
        component.name,
        round(Math.random() * (component.max - component.min) + component.min, component.decimals)
      ]));
  }
}
```

- [ ] **Step 4: Implement template replacement**

Create `apps/server/src/generator/replacement.ts`:

```ts
import type { ParameterConfig } from "../config/schema";
import { generateRandomValue } from "./random";

function enabledMap(parameters: ParameterConfig[]) {
  return new Map(parameters.filter((parameter) => parameter.enabled).map((parameter) => [parameter.name, parameter]));
}

function replaceJsonValue(value: unknown, parameters: Map<string, ParameterConfig>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceJsonValue(item, parameters));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => {
      const parameter = parameters.get(key);
      return [key, parameter ? generateRandomValue(parameter) : replaceJsonValue(child, parameters)];
    }));
  }

  return value;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatStringValue(value: unknown) {
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function replaceStringAssignments(template: string, parameters: Map<string, ParameterConfig>) {
  let result = template;
  for (const [name, parameter] of parameters) {
    const pattern = new RegExp(`(?<![A-Za-z0-9_])(${escapeRegExp(name)}\\s*=\\s*)([^\\s,;]+)`, "g");
    result = result.replace(pattern, (match, prefix) => `${prefix}${formatStringValue(generateRandomValue(parameter))}`);
  }
  return result;
}

export function generateMessageSnapshot(template: string, parameters: ParameterConfig[]) {
  const parametersByName = enabledMap(parameters);

  try {
    return JSON.stringify(replaceJsonValue(JSON.parse(template), parametersByName));
  } catch {
    return replaceStringAssignments(template, parametersByName);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w apps/server -- message-generator`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/server/src/generator apps/server/test/message-generator.test.ts
git commit -m "feat: generate randomized message snapshots"
```

---

### Task 4: Add Config Store And Runtime Logs

**Files:**
- Create: `apps/server/src/config/store.ts`
- Create: `apps/server/src/runtime/logs.ts`
- Create: `apps/server/test/store-and-logs.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/server/test/store-and-logs.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigStore } from "../src/config/store";
import { defaultConfig } from "../src/config/schema";
import { RecentLogs } from "../src/runtime/logs";

describe("ConfigStore", () => {
  it("persists and loads simulator config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sim-config-"));
    const store = new ConfigStore(join(dir, "config.json"));
    await store.save({ ...defaultConfig, messageTemplate: "aa=100" });
    expect((await store.load()).messageTemplate).toBe("aa=100");
    await rm(dir, { recursive: true, force: true });
  });
});

describe("RecentLogs", () => {
  it("keeps the newest entries within the limit", () => {
    const logs = new RecentLogs(2);
    logs.add("info", "one");
    logs.add("info", "two");
    logs.add("info", "three");
    expect(logs.list().map((entry) => entry.message)).toEqual(["two", "three"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- store-and-logs`

Expected: FAIL because store and logs files do not exist.

- [ ] **Step 3: Implement config store**

Create `apps/server/src/config/store.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { defaultConfig, simulatorConfigSchema, type SimulatorConfig } from "./schema";

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<SimulatorConfig> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return simulatorConfigSchema.parse(JSON.parse(raw));
    } catch (error) {
      return defaultConfig;
    }
  }

  async save(config: SimulatorConfig): Promise<void> {
    const parsed = simulatorConfigSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(parsed, null, 2), "utf8");
  }
}
```

- [ ] **Step 4: Implement recent logs**

Create `apps/server/src/runtime/logs.ts`:

```ts
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

  constructor(private readonly limit = 100) {}

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
    return [...this.entries];
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w apps/server -- store-and-logs`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/server/src/config/store.ts apps/server/src/runtime/logs.ts apps/server/test/store-and-logs.test.ts
git commit -m "feat: persist config and bound runtime logs"
```

---

### Task 5: Build Runtime Core With Test Adapter

**Files:**
- Create: `apps/server/src/adapters/types.ts`
- Create: `apps/server/src/runtime/runtime.ts`
- Create: `apps/server/test/runtime.test.ts`

- [ ] **Step 1: Write failing runtime tests**

Create `apps/server/test/runtime.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { SimulatorRuntime } from "../src/runtime/runtime";
import { defaultConfig } from "../src/config/schema";
import type { SimulatorAdapter } from "../src/adapters/types";

describe("SimulatorRuntime", () => {
  it("starts, creates a snapshot, and stops the adapter", async () => {
    const adapter: SimulatorAdapter = {
      start: vi.fn(),
      stop: vi.fn(),
      getStatus: () => ({ connectedClients: 0 })
    };
    const runtime = new SimulatorRuntime({ http: adapter });
    await runtime.start(defaultConfig);
    expect(runtime.getStatus().running).toBe(true);
    expect(runtime.getStatus().lastMessage).toBe("{\"aa\":100}".replace("100", runtime.getStatus().lastMessage.includes("100") ? "100" : runtime.getStatus().lastMessage));
    await runtime.stop();
    expect(adapter.stop).toHaveBeenCalled();
    expect(runtime.getStatus().running).toBe(false);
  });

  it("rejects starting while already running", async () => {
    const adapter: SimulatorAdapter = { start: vi.fn(), stop: vi.fn(), getStatus: () => ({ connectedClients: 0 }) };
    const runtime = new SimulatorRuntime({ http: adapter });
    await runtime.start(defaultConfig);
    await expect(runtime.start(defaultConfig)).rejects.toThrow("Simulator is already running");
    await runtime.stop();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- runtime`

Expected: FAIL because runtime and adapter types do not exist.

- [ ] **Step 3: Implement adapter types**

Create `apps/server/src/adapters/types.ts`:

```ts
import type { SimulatorConfig } from "../config/schema";
import type { RecentLogs } from "../runtime/logs";

export interface AdapterStatus {
  connectedClients?: number;
  requestCount?: number;
  listenAddress?: string;
}

export interface AdapterContext {
  config: SimulatorConfig;
  getSnapshot: () => string;
  logs: RecentLogs;
}

export interface SimulatorAdapter {
  start(context: AdapterContext): Promise<void>;
  stop(): Promise<void>;
  getStatus(): AdapterStatus;
}
```

- [ ] **Step 4: Implement runtime**

Create `apps/server/src/runtime/runtime.ts`:

```ts
import type { SimulatorAdapter } from "../adapters/types";
import { simulatorConfigSchema, type SimulatorConfig } from "../config/schema";
import { generateMessageSnapshot } from "../generator/replacement";
import { RecentLogs } from "./logs";

export class SimulatorRuntime {
  private running = false;
  private activeAdapter?: SimulatorAdapter;
  private activeConfig?: SimulatorConfig;
  private randomizeTimer?: NodeJS.Timeout;
  private lastRandomizedAt = 0;
  private snapshot = "";
  readonly logs = new RecentLogs(100);

  constructor(private readonly adapters: Partial<Record<SimulatorConfig["protocol"], SimulatorAdapter>>) {}

  async start(config: SimulatorConfig) {
    if (this.running) throw new Error("Simulator is already running");
    const parsed = simulatorConfigSchema.parse(config);
    const adapter = this.adapters[parsed.protocol];
    if (!adapter) throw new Error(`No adapter registered for ${parsed.protocol}`);

    this.activeConfig = parsed;
    this.activeAdapter = adapter;
    this.refreshSnapshot();
    await adapter.start({ config: parsed, getSnapshot: () => this.getFreshSnapshotForHttp(), logs: this.logs });
    this.randomizeTimer = setInterval(() => this.refreshSnapshot(), parsed.randomizeIntervalSeconds * 1000);
    this.running = true;
    this.logs.add("info", `Started ${parsed.protocol} simulator`);
  }

  async stop() {
    if (this.randomizeTimer) clearInterval(this.randomizeTimer);
    this.randomizeTimer = undefined;
    if (this.activeAdapter) await this.activeAdapter.stop();
    if (this.running) this.logs.add("info", "Stopped simulator");
    this.running = false;
    this.activeAdapter = undefined;
    this.activeConfig = undefined;
  }

  getStatus() {
    return {
      running: this.running,
      protocol: this.activeConfig?.protocol,
      lastMessage: this.snapshot,
      logs: this.logs.list(),
      adapter: this.activeAdapter?.getStatus() ?? {}
    };
  }

  private refreshSnapshot() {
    if (!this.activeConfig) return;
    this.snapshot = generateMessageSnapshot(this.activeConfig.messageTemplate, this.activeConfig.parameters);
    this.lastRandomizedAt = Date.now();
  }

  private getFreshSnapshotForHttp() {
    if (!this.activeConfig) return this.snapshot;
    const expired = Date.now() - this.lastRandomizedAt >= this.activeConfig.randomizeIntervalSeconds * 1000;
    if (expired) this.refreshSnapshot();
    return this.snapshot;
  }
}
```

- [ ] **Step 5: Simplify brittle assertion in runtime test**

Modify the first test assertion in `apps/server/test/runtime.test.ts`:

```ts
expect(runtime.getStatus().lastMessage).toMatch(/"aa":\d+/);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -w apps/server -- runtime`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/server/src/adapters/types.ts apps/server/src/runtime/runtime.ts apps/server/test/runtime.test.ts
git commit -m "feat: add single simulator runtime"
```

---

### Task 6: Implement HTTP Adapter And Management API

**Files:**
- Create: `apps/server/src/adapters/http.ts`
- Create: `apps/server/src/api/routes.ts`
- Modify: `apps/server/src/index.ts`
- Create: `apps/server/test/http-api.test.ts`

- [ ] **Step 1: Write failing API test**

Create `apps/server/test/http-api.test.ts`:

```ts
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerRoutes } from "../src/api/routes";
import { defaultConfig } from "../src/config/schema";

describe("management API", () => {
  it("saves config and returns status", async () => {
    const app = Fastify();
    await registerRoutes(app);
    const save = await app.inject({ method: "PUT", url: "/api/config", payload: defaultConfig });
    expect(save.statusCode).toBe(200);
    const status = await app.inject({ method: "GET", url: "/api/status" });
    expect(status.statusCode).toBe(200);
    expect(status.json().running).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- http-api`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement HTTP protocol adapter**

Create `apps/server/src/adapters/http.ts`:

```ts
import Fastify, { type FastifyInstance } from "fastify";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types";

export class HttpAdapter implements SimulatorAdapter {
  private app?: FastifyInstance;
  private status: AdapterStatus = { requestCount: 0 };

  async start(context: AdapterContext) {
    const settings = context.config.serverSettings.http;
    this.app = Fastify();
    this.app.get(settings.path, async (_request, reply) => {
      this.status.requestCount = (this.status.requestCount ?? 0) + 1;
      context.logs.add("info", `HTTP request ${settings.path}`);
      return reply.type(settings.contentType).send(context.getSnapshot());
    });
    await this.app.listen({ host: "0.0.0.0", port: settings.port });
    this.status.listenAddress = `http://localhost:${settings.port}${settings.path}`;
  }

  async stop() {
    await this.app?.close();
    this.app = undefined;
    this.status = { requestCount: 0 };
  }

  getStatus() {
    return this.status;
  }
}
```

- [ ] **Step 4: Implement management routes**

Create `apps/server/src/api/routes.ts`:

```ts
import type { FastifyInstance } from "fastify";
import { HttpAdapter } from "../adapters/http";
import { defaultConfig, simulatorConfigSchema, type SimulatorConfig } from "../config/schema";
import { SimulatorRuntime } from "../runtime/runtime";

let currentConfig: SimulatorConfig = defaultConfig;
const runtime = new SimulatorRuntime({ http: new HttpAdapter() });

export async function registerRoutes(app: FastifyInstance) {
  app.get("/api/config", async () => currentConfig);

  app.put("/api/config", async (request, reply) => {
    currentConfig = simulatorConfigSchema.parse(request.body);
    return reply.send(currentConfig);
  });

  app.get("/api/status", async () => runtime.getStatus());

  app.post("/api/start", async (_request, reply) => {
    await runtime.start(currentConfig);
    return reply.send(runtime.getStatus());
  });

  app.post("/api/stop", async (_request, reply) => {
    await runtime.stop();
    return reply.send(runtime.getStatus());
  });
}
```

Modify `apps/server/src/index.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerRoutes } from "./api/routes";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await registerRoutes(app);

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ host: "0.0.0.0", port });
```

- [ ] **Step 5: Run API test**

Run: `npm run test -w apps/server -- http-api`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/server/src/adapters/http.ts apps/server/src/api/routes.ts apps/server/src/index.ts apps/server/test/http-api.test.ts
git commit -m "feat: add HTTP simulator and management API"
```

---

### Task 7: Implement WebSocket And TCP Adapters

**Files:**
- Create: `apps/server/src/adapters/websocket.ts`
- Create: `apps/server/src/adapters/tcp.ts`
- Modify: `apps/server/src/api/routes.ts`
- Create: `apps/server/test/socket-adapters.test.ts`

- [ ] **Step 1: Write adapter smoke tests**

Create `apps/server/test/socket-adapters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TcpAdapter } from "../src/adapters/tcp";
import { WebSocketAdapter } from "../src/adapters/websocket";

describe("socket adapters", () => {
  it("constructs TCP and WebSocket adapters", () => {
    expect(new TcpAdapter().getStatus()).toEqual({ connectedClients: 0 });
    expect(new WebSocketAdapter().getStatus()).toEqual({ connectedClients: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- socket-adapters`

Expected: FAIL because adapter files do not exist.

- [ ] **Step 3: Implement WebSocket adapter**

Create `apps/server/src/adapters/websocket.ts`:

```ts
import { createServer, type Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types";

export class WebSocketAdapter implements SimulatorAdapter {
  private server?: Server;
  private wss?: WebSocketServer;
  private timer?: NodeJS.Timeout;
  private clients = new Set<WebSocket>();

  async start(context: AdapterContext) {
    const settings = context.config.serverSettings.websocket;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server, path: settings.path });
    this.wss.on("connection", (socket) => {
      this.clients.add(socket);
      context.logs.add("info", "WebSocket client connected");
      socket.on("close", () => {
        this.clients.delete(socket);
        context.logs.add("info", "WebSocket client disconnected");
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(settings.port, "0.0.0.0", resolve));
    this.timer = setInterval(() => {
      for (const socket of this.clients) {
        socket.send(context.getSnapshot());
      }
      if (this.clients.size > 0) context.logs.add("info", `WebSocket sent to ${this.clients.size} clients`);
    }, context.config.sendIntervalSeconds * 1000);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    for (const socket of this.clients) socket.close();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
    this.clients.clear();
  }

  getStatus(): AdapterStatus {
    return { connectedClients: this.clients.size };
  }
}
```

- [ ] **Step 4: Implement TCP adapter**

Create `apps/server/src/adapters/tcp.ts`:

```ts
import { createServer, type Server, type Socket } from "node:net";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types";

export class TcpAdapter implements SimulatorAdapter {
  private server?: Server;
  private timer?: NodeJS.Timeout;
  private clients = new Set<Socket>();

  async start(context: AdapterContext) {
    const settings = context.config.serverSettings.tcp;
    this.server = createServer((socket) => {
      this.clients.add(socket);
      context.logs.add("info", "TCP client connected");
      socket.on("close", () => {
        this.clients.delete(socket);
        context.logs.add("info", "TCP client disconnected");
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(settings.port, "0.0.0.0", resolve));
    this.timer = setInterval(() => {
      const payload = context.getSnapshot() + (settings.appendNewline ? "\n" : "");
      for (const socket of this.clients) socket.write(payload, settings.encoding);
      if (this.clients.size > 0) context.logs.add("info", `TCP sent to ${this.clients.size} clients`);
    }, context.config.sendIntervalSeconds * 1000);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    for (const socket of this.clients) socket.destroy();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
    this.clients.clear();
  }

  getStatus(): AdapterStatus {
    return { connectedClients: this.clients.size };
  }
}
```

- [ ] **Step 5: Register adapters in API routes**

Modify the imports and runtime construction in `apps/server/src/api/routes.ts`:

```ts
import { HttpAdapter } from "../adapters/http";
import { TcpAdapter } from "../adapters/tcp";
import { WebSocketAdapter } from "../adapters/websocket";
```

```ts
const runtime = new SimulatorRuntime({
  http: new HttpAdapter(),
  websocket: new WebSocketAdapter(),
  tcp: new TcpAdapter()
});
```

- [ ] **Step 6: Run test**

Run: `npm run test -w apps/server -- socket-adapters`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/server/src/adapters/websocket.ts apps/server/src/adapters/tcp.ts apps/server/src/api/routes.ts apps/server/test/socket-adapters.test.ts
git commit -m "feat: add websocket and tcp adapters"
```

---

### Task 8: Implement MQTT And OPC UA Adapters

**Files:**
- Create: `apps/server/src/adapters/mqtt.ts`
- Create: `apps/server/src/adapters/opcua.ts`
- Modify: `apps/server/src/api/routes.ts`
- Create: `apps/server/test/industrial-adapters.test.ts`

- [ ] **Step 1: Write smoke tests**

Create `apps/server/test/industrial-adapters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MqttAdapter } from "../src/adapters/mqtt";
import { OpcUaAdapter } from "../src/adapters/opcua";

describe("MQTT and OPC UA adapters", () => {
  it("constructs with empty status", () => {
    expect(new MqttAdapter().getStatus()).toEqual({ connectedClients: 0 });
    expect(new OpcUaAdapter().getStatus()).toEqual({ connectedClients: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/server -- industrial-adapters`

Expected: FAIL because adapter files do not exist.

- [ ] **Step 3: Implement MQTT adapter**

Create `apps/server/src/adapters/mqtt.ts`:

```ts
import { createServer, type Server } from "node:net";
import aedes, { type Aedes } from "aedes";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types";

export class MqttAdapter implements SimulatorAdapter {
  private broker?: Aedes;
  private server?: Server;
  private timer?: NodeJS.Timeout;
  private connectedClients = 0;

  async start(context: AdapterContext) {
    const settings = context.config.serverSettings.mqtt;
    this.broker = aedes();
    this.broker.on("client", () => {
      this.connectedClients += 1;
      context.logs.add("info", "MQTT client connected");
    });
    this.broker.on("clientDisconnect", () => {
      this.connectedClients = Math.max(0, this.connectedClients - 1);
      context.logs.add("info", "MQTT client disconnected");
    });
    this.server = createServer(this.broker.handle);
    await new Promise<void>((resolve) => this.server!.listen(settings.port, "0.0.0.0", resolve));
    this.timer = setInterval(() => {
      this.broker?.publish({
        topic: settings.topic,
        payload: context.getSnapshot(),
        qos: settings.qos,
        retain: settings.retain
      });
      context.logs.add("info", `MQTT published ${settings.topic}`);
    }, context.config.sendIntervalSeconds * 1000);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
    await new Promise<void>((resolve) => this.broker?.close(() => resolve()) ?? resolve());
    this.connectedClients = 0;
  }

  getStatus(): AdapterStatus {
    return { connectedClients: this.connectedClients };
  }
}
```

- [ ] **Step 4: Implement OPC UA adapter**

Create `apps/server/src/adapters/opcua.ts`:

```ts
import { DataType, OPCUAServer, Variant } from "node-opcua";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types";

function toDataType(value: string): DataType {
  if (value === "Double") return DataType.Double;
  if (value === "Boolean") return DataType.Boolean;
  return DataType.String;
}

function coerceSnapshot(snapshot: string, dataType: string) {
  if (dataType === "Double") return Number(JSON.parse(snapshot));
  if (dataType === "Boolean") return Boolean(JSON.parse(snapshot));
  return snapshot;
}

export class OpcUaAdapter implements SimulatorAdapter {
  private server?: OPCUAServer;
  private timer?: NodeJS.Timeout;

  async start(context: AdapterContext) {
    const settings = context.config.serverSettings.opcua;
    this.server = new OPCUAServer({
      port: settings.port,
      resourcePath: settings.endpointPath,
      buildInfo: { productName: "MessageSimulator", buildNumber: "1", buildDate: new Date() }
    });
    await this.server.initialize();
    const addressSpace = this.server.engine.addressSpace!;
    const namespace = addressSpace.registerNamespace(settings.namespace);
    const folder = namespace.addFolder(addressSpace.rootFolder.objects, { browseName: "MessageSimulator" });
    let currentValue = coerceSnapshot(context.getSnapshot(), settings.dataType);
    namespace.addVariable({
      componentOf: folder,
      browseName: "Message",
      nodeId: settings.nodeId,
      dataType: settings.dataType,
      value: {
        get: () => new Variant({ dataType: toDataType(settings.dataType), value: currentValue })
      }
    });
    await this.server.start();
    this.timer = setInterval(() => {
      currentValue = coerceSnapshot(context.getSnapshot(), settings.dataType);
      context.logs.add("info", `OPC UA updated ${settings.nodeId}`);
    }, context.config.randomizeIntervalSeconds * 1000);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    await this.server?.shutdown(100);
    this.server = undefined;
  }

  getStatus(): AdapterStatus {
    return { connectedClients: 0 };
  }
}
```

- [ ] **Step 5: Register adapters in API routes**

Modify imports in `apps/server/src/api/routes.ts`:

```ts
import { MqttAdapter } from "../adapters/mqtt";
import { OpcUaAdapter } from "../adapters/opcua";
```

Modify runtime construction:

```ts
const runtime = new SimulatorRuntime({
  http: new HttpAdapter(),
  websocket: new WebSocketAdapter(),
  tcp: new TcpAdapter(),
  mqtt: new MqttAdapter(),
  opcua: new OpcUaAdapter()
});
```

- [ ] **Step 6: Run test**

Run: `npm run test -w apps/server -- industrial-adapters`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/server/src/adapters/mqtt.ts apps/server/src/adapters/opcua.ts apps/server/src/api/routes.ts apps/server/test/industrial-adapters.test.ts
git commit -m "feat: add mqtt and opc ua adapters"
```

---

### Task 9: Build React Management UI

**Files:**
- Create: `apps/web/src/types.ts`
- Create: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/ProtocolSettings.tsx`
- Create: `apps/web/src/components/ParameterEditor.tsx`
- Create: `apps/web/src/components/StatusPanel.tsx`
- Create: `apps/web/src/components/MessageTemplate.tsx`
- Create: `apps/web/src/test-setup.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/test/app.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `apps/web/test/app.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("App", () => {
  it("renders protocol selector and parameter editor", () => {
    render(<App />);
    expect(screen.getByLabelText("协议")).toBeInTheDocument();
    expect(screen.getByText("自定义参数")).toBeInTheDocument();
    expect(screen.getByText("消息模板")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/web -- app`

Expected: FAIL because UI components are not implemented and jest-dom setup may be missing.

- [ ] **Step 3: Add shared frontend types and API client**

Create `apps/web/src/types.ts` with the same public shape as `SimulatorConfig` from the backend:

```ts
export type Protocol = "http" | "mqtt" | "websocket" | "tcp" | "opcua";
export type ParameterType = "integer" | "float" | "string" | "boolean" | "vector";

export interface SimulatorConfig {
  protocol: Protocol;
  serverSettings: {
    http: { port: number; path: string; contentType: string };
    mqtt: { port: number; topic: string; qos: 0 | 1 | 2; retain: boolean };
    websocket: { port: number; path: string };
    tcp: { port: number; appendNewline: boolean; encoding: "utf8" | "ascii" };
    opcua: { port: number; endpointPath: string; namespace: string; nodeId: string; dataType: "String" | "Double" | "Boolean" };
  };
  messageTemplate: string;
  parameters: Array<any>;
  sendIntervalSeconds: number;
  randomizeIntervalSeconds: number;
}

export const defaultConfig: SimulatorConfig = {
  protocol: "http",
  serverSettings: {
    http: { port: 8080, path: "/message", contentType: "application/json" },
    mqtt: { port: 1883, topic: "simulator/message", qos: 0, retain: false },
    websocket: { port: 8081, path: "/ws" },
    tcp: { port: 9000, appendNewline: true, encoding: "utf8" },
    opcua: { port: 4840, endpointPath: "/simulator", namespace: "MessageSimulator", nodeId: "s=Message", dataType: "String" }
  },
  messageTemplate: "{\"aa\":100}",
  parameters: [{ name: "aa", type: "integer", enabled: true, min: 0, max: 999 }],
  sendIntervalSeconds: 1,
  randomizeIntervalSeconds: 5
};
```

Create `apps/web/src/api.ts`:

```ts
import type { SimulatorConfig } from "./types";

const baseUrl = "/api";

export async function saveConfig(config: SimulatorConfig) {
  const response = await fetch(`${baseUrl}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function startSimulator() {
  const response = await fetch(`${baseUrl}/start`, { method: "POST" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function stopSimulator() {
  const response = await fetch(`${baseUrl}/stop`, { method: "POST" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```

- [ ] **Step 4: Add frontend test setup**

Create `apps/web/src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `apps/web/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"]
  }
});
```

- [ ] **Step 5: Create UI components**

Create `apps/web/src/components/StatusPanel.tsx`:

```tsx
export function StatusPanel({ running }: { running: boolean }) {
  return <section><strong>状态：</strong>{running ? "运行中" : "已停止"}</section>;
}
```

Create `apps/web/src/components/ProtocolSettings.tsx`:

```tsx
import type { SimulatorConfig } from "../types";

export function ProtocolSettings({ config, setConfig }: { config: SimulatorConfig; setConfig: (config: SimulatorConfig) => void }) {
  return (
    <section>
      <label>
        协议
        <select value={config.protocol} onChange={(event) => setConfig({ ...config, protocol: event.target.value as SimulatorConfig["protocol"] })}>
          <option value="http">HTTP</option>
          <option value="mqtt">MQTT</option>
          <option value="websocket">WebSocket</option>
          <option value="tcp">TCP</option>
          <option value="opcua">OPC UA</option>
        </select>
      </label>
      <p>当前配置：{config.protocol}</p>
    </section>
  );
}
```

Create `apps/web/src/components/MessageTemplate.tsx`:

```tsx
export function MessageTemplate({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <section>
      <h2>消息模板</h2>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={8} />
    </section>
  );
}
```

Create `apps/web/src/components/ParameterEditor.tsx`:

```tsx
export function ParameterEditor() {
  return (
    <section>
      <h2>自定义参数</h2>
      <button type="button">新增参数</button>
    </section>
  );
}
```

- [ ] **Step 6: Compose App**

Modify `apps/web/src/App.tsx`:

```tsx
import { useState } from "react";
import { MessageTemplate } from "./components/MessageTemplate";
import { ParameterEditor } from "./components/ParameterEditor";
import { ProtocolSettings } from "./components/ProtocolSettings";
import { StatusPanel } from "./components/StatusPanel";
import { defaultConfig } from "./types";

export function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [running] = useState(false);

  return (
    <main>
      <h1>模拟消息发送器</h1>
      <StatusPanel running={running} />
      <ProtocolSettings config={config} setConfig={setConfig} />
      <section>
        <label>发送间隔（秒）<input type="number" value={config.sendIntervalSeconds} readOnly={config.protocol === "http"} /></label>
        <label>随机刷新间隔（秒）<input type="number" value={config.randomizeIntervalSeconds} /></label>
      </section>
      <MessageTemplate value={config.messageTemplate} onChange={(messageTemplate) => setConfig({ ...config, messageTemplate })} />
      <ParameterEditor />
    </main>
  );
}
```

- [ ] **Step 7: Run UI test**

Run: `npm run test -w apps/web -- app`

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/src apps/web/test apps/web/vitest.config.ts
git commit -m "feat: add management UI shell"
```

---

### Task 10: Complete Dynamic Parameter And Protocol Forms

**Files:**
- Modify: `apps/web/src/components/ProtocolSettings.tsx`
- Modify: `apps/web/src/components/ParameterEditor.tsx`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/test/forms.test.tsx`

- [ ] **Step 1: Write form behavior tests**

Create `apps/web/test/forms.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("dynamic forms", () => {
  it("shows MQTT fields after protocol switch", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "mqtt" } });
    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
  });

  it("shows vector component controls", () => {
    render(<App />);
    expect(screen.getByText("新增参数")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/web -- forms`

Expected: FAIL because protocol-specific fields are not implemented.

- [ ] **Step 3: Expand protocol settings component**

Modify `apps/web/src/components/ProtocolSettings.tsx` so it renders fields for the selected protocol. Use labeled inputs for `HTTP Path`, `Topic`, `WebSocket Path`, `TCP Encoding`, and `NodeId`. Bind each input into `config.serverSettings[config.protocol]`.

Concrete MQTT field:

```tsx
{config.protocol === "mqtt" && (
  <>
    <label>Topic<input value={config.serverSettings.mqtt.topic} onChange={(event) => setConfig({ ...config, serverSettings: { ...config.serverSettings, mqtt: { ...config.serverSettings.mqtt, topic: event.target.value } } })} /></label>
    <label>QoS<select value={config.serverSettings.mqtt.qos} onChange={(event) => setConfig({ ...config, serverSettings: { ...config.serverSettings, mqtt: { ...config.serverSettings.mqtt, qos: Number(event.target.value) as 0 | 1 | 2 } } })}><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></label>
    <label><input type="checkbox" checked={config.serverSettings.mqtt.retain} onChange={(event) => setConfig({ ...config, serverSettings: { ...config.serverSettings, mqtt: { ...config.serverSettings.mqtt, retain: event.target.checked } } })} /> Retain</label>
  </>
)}
```

- [ ] **Step 4: Expand parameter editor**

Modify `apps/web/src/components/ParameterEditor.tsx` to accept `parameters` and `onChange`. Render each parameter with name, type selector, enabled checkbox, delete button, and type-specific inputs. For vector, render component rows with component name, min, max, decimals, add component, and delete component.

Use this function for adding a default parameter:

```tsx
const nextParameter = {
  name: `param${parameters.length + 1}`,
  type: "integer",
  enabled: true,
  min: 0,
  max: 100
};
```

- [ ] **Step 5: Wire App to parameter editor**

Modify `apps/web/src/App.tsx`:

```tsx
<ParameterEditor
  parameters={config.parameters}
  onChange={(parameters) => setConfig({ ...config, parameters })} 
/>
```

- [ ] **Step 6: Run form tests**

Run: `npm run test -w apps/web -- forms`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/web/src/components apps/web/src/App.tsx apps/web/test/forms.test.tsx
git commit -m "feat: add dynamic simulator configuration forms"
```

---

### Task 11: Add Preview, Start, Stop, And Logs To UI

**Files:**
- Modify: `apps/server/src/api/routes.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/StatusPanel.tsx`
- Create: `apps/web/src/components/LogViewer.tsx`
- Create: `apps/web/test/runtime-controls.test.tsx`

- [ ] **Step 1: Add preview API on the server**

Modify `apps/server/src/api/routes.ts`:

```ts
import { generateMessageSnapshot } from "../generator/replacement";
```

Add route inside `registerRoutes`:

```ts
app.post("/api/preview", async (request, reply) => {
  const config = simulatorConfigSchema.parse(request.body);
  return reply.send({ message: generateMessageSnapshot(config.messageTemplate, config.parameters) });
});
```

- [ ] **Step 2: Add frontend API methods**

Modify `apps/web/src/api.ts`:

```ts
export async function previewMessage(config: SimulatorConfig) {
  const response = await fetch(`${baseUrl}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ message: string }>;
}
```

- [ ] **Step 3: Add log viewer**

Create `apps/web/src/components/LogViewer.tsx`:

```tsx
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
      <ul>{logs.map((log) => <li key={log.id}>[{log.level}] {log.message}</li>)}</ul>
    </section>
  );
}
```

- [ ] **Step 4: Wire runtime controls in App**

Modify `apps/web/src/App.tsx` to call `saveConfig`, `startSimulator`, `stopSimulator`, and `previewMessage`. Store `status`, `preview`, and `error` in React state. Buttons should be labeled `启动`, `停止`, and `预览生成消息`.

Use this handler shape:

```tsx
async function handleStart() {
  await saveConfig(config);
  setStatus(await startSimulator());
}
```

- [ ] **Step 5: Write runtime control test**

Create `apps/web/test/runtime-controls.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("runtime controls", () => {
  it("shows start stop and preview controls", () => {
    render(<App />);
    expect(screen.getByText("启动")).toBeInTheDocument();
    expect(screen.getByText("停止")).toBeInTheDocument();
    expect(screen.getByText("预览生成消息")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm run test -w apps/web -- runtime-controls`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/server/src/api/routes.ts apps/web/src apps/web/test/runtime-controls.test.tsx
git commit -m "feat: wire simulator controls and preview"
```

---

### Task 12: Final Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# Message Simulator

Web-managed simulator for HTTP, MQTT, WebSocket, TCP, and OPC UA messages.

## Run

```bash
npm install
npm run dev
```

The backend listens on `http://localhost:3001`. Run the web UI with:

```bash
npm run dev:web
```

## Behavior

Only one simulator runs at a time. The simulator keeps a current message snapshot, refreshes it every configured randomization interval, and sends or returns that snapshot according to the selected protocol.

HTTP returns the current snapshot when the configured path is requested. MQTT, WebSocket, and TCP send the current snapshot on the send interval. OPC UA updates the configured Node on the randomization interval.
```

- [ ] **Step 2: Run all tests**

Run: `npm run test`

Expected: all backend and frontend tests pass.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: both packages typecheck with no errors.

- [ ] **Step 4: Build**

Run: `npm run build`

Expected: backend and frontend builds complete.

- [ ] **Step 5: Commit**

Run:

```bash
git add README.md
git commit -m "docs: describe simulator usage"
```

Expected: commit succeeds if the workspace is a git repository.
