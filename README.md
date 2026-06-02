# Message Simulator

Web-managed simulator for HTTP, MQTT, WebSocket, TCP, and OPC UA messages.

## Run

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm run dev
```

The backend listens on `http://localhost:3001`.

Start the web UI in another terminal:

```bash
npm run dev:web
```

## Behavior

Only one simulator runs at a time. The simulator keeps a current message snapshot, refreshes it every configured randomization interval, and sends or returns that snapshot according to the selected protocol.

- HTTP returns the current snapshot when the configured path is requested.
- MQTT publishes the current snapshot to the configured topic on the send interval.
- WebSocket sends the current snapshot to connected clients on the send interval.
- TCP writes the current snapshot to connected sockets on the send interval.
- OPC UA updates the configured Node on the randomization interval.

Randomization refreshes are not logged. Logs focus on start, stop, client activity, requests, sends, Node updates, and errors.

## Message Templates

Templates can be JSON or plain strings.

For JSON, matching object keys are replaced:

```json
{"aa":100}
```

For strings, assignment values are replaced:

```text
aa=100
```

If the same parameter appears multiple times, each occurrence gets its own random value during the same randomization pass.
